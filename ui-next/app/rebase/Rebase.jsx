"use client";

import AgentConsole from "../_components/AgentConsole";

// Same console as /release. Drives the git-rebaser agent (see /api/rebase): tích hợp git — ĐO diverge
// rồi chọn rebase hay MERGE develop vào nhánh feature, resolve conflict (rerere + union CHANGELOG),
// build verify, rồi force-push (--force-with-lease) / commit merge. Không gh pr merge.
const EXAMPLES = [
  "So nhánh hiện tại vs develop (rezil-esms-lib): ahead/behind bao nhiêu, nên rebase hay merge? (chỉ xem)",
  "Preview conflict merge develop vào nhánh hiện tại bằng git merge-tree (không đụng working tree)",
  "Merge origin/develop vào nhánh hiện tại trên nhánh tạm, resolve conflict rồi sbt compile verify",
  "Rebase fix/2026-07-REZIL-2xxx-TECH-002 (rezil-esms) lên develop mới nhất (nhánh của mình, chưa push)",
  "Squash 3 commit cuối nhánh này thành 1 (reset --soft), giữ message tổng hợp",
];

const config = {
  apiPath: "/api/rebase",
  storageKey: "rebase:console",
  accent: "blue",
  icon: "🔀",
  title: "Rebase / Merge",
  badge: "git-rebaser",
  examples: EXAMPLES,
  emptyText:
    "Tích hợp git: base mặc định là develop. ĐO diverge trước rồi chọn REBASE hay MERGE — nhánh diverge nhiều/dùng chung (nhiều người cùng push) thì merge develop vào nhánh (resolve 1 lần, không rewrite history). Preview bằng git merge-tree, làm trên nhánh tạm, rerere + union cho CHANGELOG, build verify trước khi commit. Mọi action ghi (rebase/merge/--continue/force-push/commit) hỏi xác nhận. Không force-push develop/main, không gh pr merge.",
  placeholder: "Vd: nên rebase hay merge develop vào nhánh hiện tại (rezil-esms-lib)?",
  editToggle: false,
};

export default function Rebase() {
  return <AgentConsole config={config} />;
}
