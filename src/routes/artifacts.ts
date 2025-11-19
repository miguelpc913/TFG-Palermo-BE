import { Router } from "express"
import artifactService from "../services/artifactServices.js"

type FieldsOfActionsWeRequire = {
  workflow_runs: { id: number; conclusion: "success" | "failure" }[]
}

type FieldsOfArtifactWeRequire = {
  artifacts: {
    name: string
    archive_download_url: string
  }[]
}

type ArtifactsDictionary = {
  windows?: string
  linux?: string
  macOs?: string
}
const { GITHUB_TOKEN } = process.env

const router = Router()

const { getArtifacts } = artifactService()

router.get("/", async (_req, res) => {
  const artifactRequest = getArtifacts()
  res.status(500).json(artifactRequest)
})

export default router
