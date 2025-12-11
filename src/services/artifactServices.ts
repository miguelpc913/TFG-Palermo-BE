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
  android?: string
}

const { GITHUB_TOKEN } = process.env

export default function artifactService() {
  const getArtifacts = async () => {
    const actionsResponse = await fetch(
      "https://api.github.com/repos/miguelpc913/TFG-Palermo-FE/actions/runs?per_page=1",
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      },
    )
    const actionsWeRequire: FieldsOfActionsWeRequire =
      await actionsResponse.json()
    const firstGithubAction = actionsWeRequire.workflow_runs.find(
      (action) => action.conclusion === "success",
    )
    const artifactsResponse = await fetch(
      `https://api.github.com/repos/miguelpc913/TFG-Palermo-FE/actions/runs/${firstGithubAction?.id}/artifacts`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      },
    )
    const { artifacts } =
      (await artifactsResponse.json()) as FieldsOfArtifactWeRequire

    const windowsDownloadUrl = artifacts?.find(
      (artifact) => artifact.name === "tauri-windows",
    )?.archive_download_url
    const linuxDownloadUrl = artifacts?.find(
      (artifact) => artifact.name === "tauri-linux",
    )?.archive_download_url
    const macOsDownloadUrl = artifacts?.find(
      (artifact) => artifact.name === "tauri-macos-arm",
    )?.archive_download_url
    const androidDownloadUrl = artifacts?.find(
      (artifact) => artifact.name === "tauri-android",
    )?.archive_download_url
    const artifactsUrls: ArtifactsDictionary = {}
    if (windowsDownloadUrl) {
      const windowsArtifactRequest = await fetch(windowsDownloadUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      })
      artifactsUrls.windows = windowsArtifactRequest.url
    }
    if (linuxDownloadUrl) {
      const linuxArtifactRequest = await fetch(linuxDownloadUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      })
      artifactsUrls.linux = linuxArtifactRequest.url
    }
    if (macOsDownloadUrl) {
      const macOsArtifactRequest = await fetch(macOsDownloadUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      })
      artifactsUrls.macOs = macOsArtifactRequest.url
    }
    if (androidDownloadUrl) {
      const androidArtifactRequest = await fetch(androidDownloadUrl, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
        },
      })
      artifactsUrls.android = androidArtifactRequest.url
    }
    return artifactsUrls
  }
  return { getArtifacts }
}
