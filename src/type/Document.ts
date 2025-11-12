import { AutomergeUrl } from "@automerge/automerge-repo"

export type Page = {
  blocks: Object[]
  parent?: AutomergeUrl
  children: AutomergeUrl[]
}
