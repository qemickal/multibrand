import demoData from './demo-data.json'
import { readStoredWorkspace, writeStoredWorkspace } from './storage.js'

export const LOCAL_KEY = 'mono-cromat-preapertura-local-v1'

export function readLocalData(storage = window.localStorage) {
  return readStoredWorkspace(storage, LOCAL_KEY, demoData)
}

export function writeLocalData(data, storage = window.localStorage) {
  writeStoredWorkspace(storage, LOCAL_KEY, data)
}
