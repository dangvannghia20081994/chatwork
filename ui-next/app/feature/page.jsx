import Feature from "./Feature";
import { listRepos } from "../../lib/config.js";

export const dynamic = "force-dynamic";

export default function FeaturePage() {
  const { repos, defaultRepo } = listRepos();
  return <Feature repos={repos} defaultRepo={defaultRepo} />;
}
