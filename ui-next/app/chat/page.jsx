import Chat from "./Chat";
import { normalizeProject } from "../../lib/config.js";

export default async function ChatPage({ searchParams }) {
  const sp = await searchParams;
  const project = normalizeProject(sp?.project);
  return <Chat initialProject={project} />;
}
