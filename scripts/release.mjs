#!/usr/bin/env node

/**
 * 태그 드리븐 릴리즈 컷(로컬).
 *
 *   node scripts/release.mjs <patch|minor|major|prerelease|X.Y.Z> [--push] [--dry-run]
 *   pnpm release patch
 *   pnpm release 1.2.0 --push
 *   pnpm release minor --dry-run   # 계획만 출력, 변경 없음
 *
 * 동작: git 태그(v*) 기준으로 다음 버전을 정해 모든 package.json(루트+packages)을
 * lockstep 으로 올리고, `release: vX.Y.Z` 커밋 + `vX.Y.Z` 주석 태그를 만든다.
 * 태그를 push 하면(`git push --follow-tags`) CI 가 npm publish + GitHub Release 를
 * 자동 생성한다. 버전 산출/쓰기는 release-version.mjs 를 재사용한다.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const VERSION_SCRIPT = path.join("scripts", "release-version.mjs");

function capture(command, args) {
  return execFileSync(command, args, {
    cwd: ROOT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function runInherit(command, args) {
  execFileSync(command, args, { cwd: ROOT_DIR, stdio: "inherit" });
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const push = argv.includes("--push");
  const positional = argv.filter((token) => !token.startsWith("--"));
  const target = positional[0] ?? "patch";

  const isExplicit = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?$/.test(target);
  const isBump = ["patch", "minor", "major", "prerelease"].includes(target);

  if (!isExplicit && !isBump) {
    fail(
      `알 수 없는 인자: "${target}". patch|minor|major|prerelease 또는 X.Y.Z 형식이어야 합니다.`,
    );
  }

  // 깨끗한 워킹트리에서만 릴리즈를 컷한다(버전 bump 만 단독 커밋되도록).
  const status = capture("git", ["status", "--porcelain"]);
  if (status && !dryRun) {
    fail("워킹트리가 깨끗하지 않습니다. 변경을 커밋/정리한 뒤 다시 실행하세요.");
  }

  // git 태그 기준으로 다음 버전 산출(쓰기 없이 계산만).
  const versionArgs = [VERSION_SCRIPT, "--source", "git"];
  if (isExplicit) {
    versionArgs.push("--version", target);
  } else {
    versionArgs.push("--bump", target);
  }
  const nextVersion = capture("node", versionArgs);
  const tag = `v${nextVersion}`;

  // 같은 태그가 이미 있으면 중단.
  const existing = capture("git", ["tag", "--list", tag]);
  if (existing) {
    fail(`태그 ${tag} 가 이미 존재합니다.`);
  }

  console.log(`릴리즈 대상: ${tag}  (${isExplicit ? "explicit" : target})`);

  if (dryRun) {
    console.log("[dry-run] package.json 업데이트 / commit / tag 를 생략했습니다.");
    console.log(`실제 실행: pnpm release ${target}`);
    return;
  }

  // 모든 package.json(루트+packages)을 nextVersion 으로 기록.
  runInherit("node", [...versionArgs, "--write"]);

  runInherit("git", ["add", "-A"]);
  runInherit("git", ["commit", "-m", `release: ${tag}`]);
  runInherit("git", ["tag", "-a", tag, "-m", tag]);
  console.log(`\n✓ 커밋 + 태그 생성: ${tag}`);

  if (push) {
    runInherit("git", ["push", "--follow-tags"]);
    console.log("✓ push 완료 — 태그 push 로 CI publish + GitHub Release 가 트리거됩니다.");
  } else {
    console.log("\n다음: git push --follow-tags");
    console.log("(태그가 origin 에 올라가면 CI 가 npm publish + GitHub Release 를 자동 생성)");
  }
}

main();
