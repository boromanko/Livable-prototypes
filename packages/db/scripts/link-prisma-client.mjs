import { existsSync, lstatSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const prismaClientPackagePath = require.resolve('@prisma/client/package.json');
const prismaClientDir = dirname(prismaClientPackagePath);
const siblingPrismaDir = join(prismaClientDir, '..', '..', '.prisma');
const prismaLinkPath = join(prismaClientDir, '.prisma');

if (!existsSync(siblingPrismaDir)) {
  throw new Error(`Generated prisma directory is missing at: ${siblingPrismaDir}`);
}

const relativeTarget = relative(prismaClientDir, siblingPrismaDir);

let existingStats = null;
try {
  existingStats = lstatSync(prismaLinkPath);
} catch {}

if (existingStats) {
  const stats = existingStats;
  if (stats.isSymbolicLink()) {
    const currentTarget = readlinkSync(prismaLinkPath);
    if (currentTarget === relativeTarget) {
      process.exit(0);
    }
  }

  rmSync(prismaLinkPath, { recursive: true, force: true });
}

const linkType = process.platform === 'win32' ? 'junction' : 'dir';
symlinkSync(relativeTarget, prismaLinkPath, linkType);
