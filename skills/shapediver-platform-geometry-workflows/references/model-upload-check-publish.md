# Model Upload, Check, And Publish

Read this reference for the PB+GB workflow that creates a Platform model, uploads the
`.gh` or `.ghx` definition to Geometry Backend, waits for model checking to finish, and
publishes only after the GB result is confirmed.

This is the canonical cross-system model-management flow. Do not treat it as PB-only.

## Why This Needs A Dedicated Flow

This workflow is different from ordinary runtime compute/export flows:

- the model must exist on PB before any GB-side model-management upload can happen,
- the GB token needs model-management scope, not export scope,
- GB polling is done through `ModelApi.getModel(...)`, not through output/export polling,
- the create-and-upload path starts from token + guid, not from ticket + session,
- PB publishes only after the GB-side checking result is synchronized back.

## Canonical Order

1. PB `models.create(...)` creates the platform model and empty GB model.
2. PB resolves model-management access data for that model:
   - GB JWT/model token,
   - real `model_view_url`,
   - canonical `guid`.
3. GB initializes `Configuration({ basePath, accessToken })`.
4. GB reads the model upload target from `ModelApi.getModel(guid)`.
5. GB uploads the `.gh` or `.ghx` bytes to the returned upload target.
6. GB polls `ModelApi.getModel(modelId)` until the status is `confirmed`, `denied`, or
   `pending`.
7. PB synchronizes the PB model status from GB.
8. PB publishes only if the synchronized PB status is confirmed.

## Required Scopes

For model upload/check/publish, request:

- `GroupOwner`
- `GroupView`

Do not reuse an export-oriented token helper that only requests `GroupView` or
`GroupView + GroupExport`.

## Improved TypeScript Pattern

This example keeps the official repo flow but tightens the helper boundaries. It separates:

- PB model creation,
- PB model-management access resolution,
- GB config initialization,
- GB model upload target resolution,
- GB model-check polling,
- PB publish gating.

```ts
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import {
  SdPlatformModelFileType,
  SdPlatformModelTokenScopes,
  SdPlatformModelStatus,
  SdPlatformModelVisibility,
  SdPlatformRequestModelStatus,
  type SdPlatformRequestModelCreate,
  type SdPlatformSdk,
  type SdPlatformResponseModelOwner,
} from "@shapediver/sdk.platform-api-sdk-v1";
import {
  Configuration,
  ModelApi,
  ReqModelFileType,
  UtilsApi,
  ResModelStatus,
  type ResGetModel,
} from "@shapediver/sdk.geometry-api-sdk-v2";

interface IGeometryBackendAccessData {
  access_token: string;
  model_view_url: string;
  guid: string;
  scopes: string[];
}

interface IPlatformBackendModelData {
  model: SdPlatformResponseModelOwner;
  access_data: IGeometryBackendAccessData;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createAndUploadModel(
  sdk: SdPlatformSdk,
  filename: string,
  title?: string,
) {
  try {
    await fsp.access(filename, fs.constants.R_OK);
  } catch {
    throw new Error(`File ${filename} can not be read`);
  }

  const platformData = await createPlatformModel(
    sdk,
    path.basename(filename),
    title,
  );
  const [config, uploadModel] = await uploadModelDefinition(
    platformData.access_data,
    filename,
  );

  const checkedModel = await waitForModelCheck(config, uploadModel.model.id);
  return publishCheckedModel(sdk, platformData, checkedModel);
}

async function createPlatformModel(
  sdk: SdPlatformSdk,
  filename: string,
  title?: string,
): Promise<IPlatformBackendModelData> {
  const filenameLower = filename.toLowerCase();
  if (!filenameLower.endsWith(".gh") && !filenameLower.endsWith(".ghx")) {
    throw new Error('File ending must be ".gh" or ".ghx".');
  }

  const body: SdPlatformRequestModelCreate = {
    filename,
    ftype: filenameLower.endsWith(".ghx")
      ? SdPlatformModelFileType.GHX
      : SdPlatformModelFileType.GH,
    title,
    backendaccess: true,
    visibility: SdPlatformModelVisibility.Private,
  };

  const scopes = [
    SdPlatformModelTokenScopes.GroupOwner,
    SdPlatformModelTokenScopes.GroupView,
  ];
  const model = (await sdk.models.create(body)).data;
  const tokenData = (
    await sdk.modelTokens.create({ id: model.id, scope: scopes })
  ).data;

  return {
    model,
    access_data: {
      access_token: tokenData.access_token,
      model_view_url: tokenData.model_view_url,
      guid: tokenData.guid ?? model.guid,
      scopes,
    },
  };
}

async function uploadModelDefinition(
  accessData: IGeometryBackendAccessData,
  filename: string,
): Promise<[Configuration, ResGetModel]> {
  const config = new Configuration({
    basePath: accessData.model_view_url,
    accessToken: accessData.access_token,
  });
  const dto = (await new ModelApi(config).getModel(accessData.guid)).data;
  const uploadTarget = dto.file?.upload;

  if (!uploadTarget) {
    throw new Error(
      "Model upload target is missing; verify GroupOwner scope and GB model state.",
    );
  }

  await new UtilsApi(config).upload(
    uploadTarget,
    await fsp.readFile(filename),
    dto.setting.compute?.ftype === ReqModelFileType.GRASSHOPPER_BINARY
      ? "application/octet-stream"
      : "application/xml",
  );

  return [config, dto];
}

async function waitForModelCheck(
  config: Configuration,
  modelId: string,
): Promise<ResGetModel> {
  let dto = (await new ModelApi(config).getModel(modelId)).data;

  if (
    ![
      ResModelStatus.NOT_UPLOADED,
      ResModelStatus.UPLOADED,
      ResModelStatus.PENDING,
    ].includes(dto.model.stat as any)
  ) {
    return dto;
  }

  let epochStart = Date.now();
  while (dto.model.stat === ResModelStatus.NOT_UPLOADED) {
    if (Date.now() - epochStart > 60_000) {
      throw new Error("Model checking did not start within 60 seconds.");
    }
    await sleep(2_500);
    dto = (await new ModelApi(config).getModel(dto.model.id)).data;
  }

  const maxCompTime = dto.setting.compute?.max_comp_time ?? 60_000;

  epochStart = Date.now();
  while (
    ![
      ResModelStatus.CONFIRMED,
      ResModelStatus.DENIED,
      ResModelStatus.PENDING,
    ].includes(dto.model.stat as any)
  ) {
    if (Date.now() - epochStart > 2 * maxCompTime) {
      return dto;
    }
    await sleep(2_500);
    dto = (await new ModelApi(config).getModel(dto.model.id)).data;
  }

  return dto;
}

async function publishCheckedModel(
  sdk: SdPlatformSdk,
  platformData: IPlatformBackendModelData,
  checkedModel: ResGetModel,
) {
  if (checkedModel.model.stat === ResModelStatus.DENIED) {
    throw new Error(`Model was denied: ${checkedModel.model.msg}`);
  }

  // Keep this as a dedicated helper in real code. The official example repo uses a
  // repo-local patch helper here to synchronize PB status from GB, then publish if confirmed.
  let model = await patchModelStatus(sdk, platformData.model.id);

  if (model.status === SdPlatformModelStatus.Confirmed) {
    model = await patchModelStatus(
      sdk,
      platformData.model.id,
      SdPlatformRequestModelStatus.Done,
    );
  }

  return model;
}

async function patchModelStatus(
  sdk: SdPlatformSdk,
  modelId: string,
  status?: SdPlatformRequestModelStatus,
) {
  // Replace this wrapper with your existing repo helper when available. The important rule
  // is: synchronize PB model status from GB first, then publish only if the synchronized
  // PB status is confirmed.
  const response = await sdk.models.patch(modelId, status ? { status } : {});
  return response.data;
}
```

## Hard Rules

- Do not request `GroupExport` for this workflow unless the same code also needs exports.
- Do not use an embedding ticket for this backend upload/check/publish path.
- Do not use `authorTicket` by default.
- Do not force ticket/session-based entry for this create-and-upload path; the official
  flow starts from PB `models.create(...)`, `modelTokens.create(...)`, and
  `ModelApi.getModel(guid)`.
- Do not treat `model_view_url` as guessable; use the PB token response.
- Do not publish after a GB `denied` result.
- Do not conflate file-parameter upload flow with model-definition upload flow.
  The former uses `FileApi.uploadFile(...)`; this model-management flow uses the model
  upload target from `ModelApi.getModel(...)`.

## If The Workflow Starts Later

If the PB model already exists and the file was already uploaded, the publish-only path is:

1. Resolve the model-management token, `model_view_url`, and `guid`.
2. Poll `waitForModelCheck(...)`.
3. Synchronize PB status.
4. Publish only if the synchronized PB status is confirmed.
