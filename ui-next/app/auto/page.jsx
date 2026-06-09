import Auto from "./Auto";
import { listRepos } from "../../lib/config.js";

export const dynamic = "force-dynamic";

export default function AutoPage() {
  const { repos, defaultRepo } = listRepos();
  return <Auto repos={repos} defaultRepo={defaultRepo} />;
}
