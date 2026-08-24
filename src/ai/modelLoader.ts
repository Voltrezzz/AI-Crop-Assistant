import { DemoCropAIModel, CropAIModel } from './demoInference';

let activeModel: CropAIModel | null = null;

export async function loadModel(useTF: boolean = false): Promise<CropAIModel> {
  if (activeModel) {
    return activeModel;
  }

  if (useTF) {
    // throw new Error("TF.js model not implemented yet.");
    console.warn("TF.js model not available. Falling back to Demo Model.");
  }

  activeModel = new DemoCropAIModel();
  await activeModel.load();
  return activeModel;
}

export function getActiveModel(): CropAIModel {
  if (!activeModel) {
    throw new Error('Model not loaded. Call loadModel() first.');
  }
  return activeModel;
}
