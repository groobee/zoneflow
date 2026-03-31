#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT_DIR = process.cwd();
const ROOT_PACKAGE_PATH = path.join(ROOT_DIR, "package.json");
const PACKAGES_DIR = path.join(ROOT_DIR, "packages");

function parseArgs(argv) {
  const args = {
    write: false,
    source: "registry",
    bump: "patch",
    version: null,
    prereleaseId: "rc",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === "--write") {
      args.write = true;
      continue;
    }

    if (token === "--source") {
      args.source = argv[index + 1] ?? args.source;
      index += 1;
      continue;
    }

    if (token === "--bump") {
      args.bump = argv[index + 1] ?? args.bump;
      index += 1;
      continue;
    }

    if (token === "--version") {
      args.version = argv[index + 1] ?? null;
      index += 1;
      continue;
    }

    if (token === "--prerelease-id") {
      args.prereleaseId = argv[index + 1] ?? args.prereleaseId;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return args;
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?$/.exec(version);

  if (!match) {
    throw new Error(`Invalid semver version: ${version}`);
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ?? null,
  };
}

function formatVersion({ major, minor, patch, prerelease }) {
  const base = `${major}.${minor}.${patch}`;
  return prerelease ? `${base}-${prerelease}` : base;
}

function bumpVersion(version, bump, prereleaseId) {
  const parsed = parseVersion(version);

  if (bump === "major") {
    return formatVersion({
      major: parsed.major + 1,
      minor: 0,
      patch: 0,
      prerelease: null,
    });
  }

  if (bump === "minor") {
    return formatVersion({
      major: parsed.major,
      minor: parsed.minor + 1,
      patch: 0,
      prerelease: null,
    });
  }

  if (bump === "patch") {
    return formatVersion({
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch + 1,
      prerelease: null,
    });
  }

  if (bump === "prerelease") {
    if (parsed.prerelease) {
      const parts = parsed.prerelease.split(".");
      const lastPart = parts[parts.length - 1];
      const nextNumber = Number.isFinite(Number(lastPart)) ? Number(lastPart) + 1 : 0;
      parts[parts.length - 1] = String(nextNumber);

      return formatVersion({
        major: parsed.major,
        minor: parsed.minor,
        patch: parsed.patch,
        prerelease: parts.join("."),
      });
    }

    return formatVersion({
      major: parsed.major,
      minor: parsed.minor,
      patch: parsed.patch + 1,
      prerelease: `${prereleaseId}.0`,
    });
  }

  throw new Error(`Unsupported bump type: ${bump}`);
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);

  if (leftNumeric && rightNumeric) {
    return Number(left) - Number(right);
  }

  if (leftNumeric) {
    return -1;
  }

  if (rightNumeric) {
    return 1;
  }

  return left.localeCompare(right);
}

function compareVersions(left, right) {
  const a = parseVersion(left);
  const b = parseVersion(right);

  for (const key of ["major", "minor", "patch"]) {
    if (a[key] !== b[key]) {
      return a[key] - b[key];
    }
  }

  if (a.prerelease === b.prerelease) {
    return 0;
  }

  if (a.prerelease === null) {
    return 1;
  }

  if (b.prerelease === null) {
    return -1;
  }

  const aParts = a.prerelease.split(".");
  const bParts = b.prerelease.split(".");
  const length = Math.max(aParts.length, bParts.length);

  for (let index = 0; index < length; index += 1) {
    const aPart = aParts[index];
    const bPart = bParts[index];

    if (aPart === undefined) {
      return -1;
    }

    if (bPart === undefined) {
      return 1;
    }

    const diff = compareIdentifiers(aPart, bPart);

    if (diff !== 0) {
      return diff;
    }
  }

  return 0;
}

function resolveWorkspacePackages() {
  if (!existsSync(PACKAGES_DIR)) {
    return [];
  }

  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = path.join("packages", entry.name);
      const filePath = path.join(ROOT_DIR, directory, "package.json");

      if (!existsSync(filePath)) {
        return null;
      }

      const json = readJson(filePath);

      if (json.private === true) {
        return null;
      }

      if (typeof json.name !== "string" || typeof json.version !== "string") {
        return null;
      }

      return {
        directory,
        filePath,
        json,
      };
    })
    .filter((entry) => entry !== null)
    .sort((left, right) => left.directory.localeCompare(right.directory));
}

function readRegistryVersion(packageName) {
  try {
    const output = execFileSync(
      "npm",
      ["view", packageName, "version", "--json", "--registry=https://registry.npmjs.org"],
      {
        cwd: ROOT_DIR,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();

    if (!output) {
      return null;
    }

    return JSON.parse(output);
  } catch {
    return null;
  }
}

function resolveBaseVersion(packages, source) {
  const localVersions = packages.map((entry) => entry.json.version);
  const localBaseVersion = localVersions.sort(compareVersions)[localVersions.length - 1];

  if (source !== "registry") {
    return localBaseVersion;
  }

  const registryVersions = packages
    .map((entry) => readRegistryVersion(entry.json.name))
    .filter((value) => typeof value === "string");

  if (registryVersions.length === 0) {
    return localBaseVersion;
  }

  return registryVersions.sort(compareVersions)[registryVersions.length - 1];
}

function updatePackageVersion(filePath, nextVersion) {
  const json = readJson(filePath);
  json.version = nextVersion;
  writeJson(filePath, json);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const packages = resolveWorkspacePackages();

  if (!existsSync(ROOT_PACKAGE_PATH)) {
    throw new Error("Root package.json not found.");
  }

  let nextVersion = args.version;

  if (nextVersion === null) {
    const baseVersion = resolveBaseVersion(packages, args.source);
    nextVersion = bumpVersion(baseVersion, args.bump, args.prereleaseId);
  } else {
    parseVersion(nextVersion);
  }

  if (args.write) {
    const rootPackage = readJson(ROOT_PACKAGE_PATH);
    rootPackage.version = nextVersion;
    writeJson(ROOT_PACKAGE_PATH, rootPackage);

    for (const entry of packages) {
      updatePackageVersion(entry.filePath, nextVersion);
    }
  }

  process.stdout.write(nextVersion);
}

main();
