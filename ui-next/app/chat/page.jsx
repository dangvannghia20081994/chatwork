import Chat from "./Chat";

export default async function ChatPage({ searchParams }) {
  const sp = await searchParams;
  const project = sp?.project === "story" ? "story" : "rezil";
  return <Chat initialProject={project} />;
}
