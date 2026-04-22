const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getActiveEditorFilePath,
  getEligibleResourcePaths,
  isExtensionResourcePath,
  isSkillResourcePath,
  isTemplateResourcePath,
} = require('../out/fileSelection.js');

test('isSkillResourcePath matches only SKILL.md files', () => {
  assert.equal(isSkillResourcePath('C:\\repo\\.pi\\skills\\review\\SKILL.md'), true);
  assert.equal(isSkillResourcePath('C:\\repo\\.pi\\prompts\\review.md'), false);
  assert.equal(isSkillResourcePath('C:\\repo\\tool.ts'), false);
});

test('isTemplateResourcePath matches markdown files except SKILL.md', () => {
  assert.equal(isTemplateResourcePath('C:\\repo\\.pi\\prompts\\review.md'), true);
  assert.equal(isTemplateResourcePath('C:\\repo\\.pi\\skills\\review\\SKILL.md'), false);
  assert.equal(isTemplateResourcePath('C:\\repo\\tool.ts'), false);
});

test('isExtensionResourcePath matches only TypeScript files', () => {
  assert.equal(isExtensionResourcePath('C:\\repo\\.pi\\extensions\\helper.ts'), true);
  assert.equal(isExtensionResourcePath('C:\\repo\\.pi\\prompts\\review.md'), false);
  assert.equal(isExtensionResourcePath('C:\\repo\\.pi\\skills\\review\\SKILL.md'), false);
});

test('getEligibleResourcePaths returns matching files when the whole selection satisfies the mode', () => {
  assert.deepEqual(
    getEligibleResourcePaths('template', [
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md', isDirectory: false },
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\fix.md', isDirectory: false },
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md', isDirectory: false },
    ]),
    [
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\prompts\\fix.md',
    ]
  );
});

test('getEligibleResourcePaths rejects mixed selections instead of partially filtering them', () => {
  assert.equal(
    getEligibleResourcePaths('template', [
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\prompts\\review.md', isDirectory: false },
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\skills\\review\\SKILL.md', isDirectory: false },
    ]),
    undefined
  );
});

test('getEligibleResourcePaths rejects selections containing folders', () => {
  assert.equal(
    getEligibleResourcePaths('extension', [
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\extensions', isDirectory: true },
      { scheme: 'file', fsPath: 'C:\\repo\\.pi\\extensions\\helper.ts', isDirectory: false },
    ]),
    undefined
  );
});

test('getActiveEditorFilePath returns the file-backed active document path', () => {
  assert.equal(
    getActiveEditorFilePath({ scheme: 'file', fsPath: 'C:\\repo\\active.ts' }),
    'C:\\repo\\active.ts'
  );
});

test('getActiveEditorFilePath rejects non-file-backed active documents', () => {
  assert.equal(
    getActiveEditorFilePath({ scheme: 'untitled', fsPath: 'C:\\repo\\scratch.ts' }),
    undefined
  );
  assert.equal(getActiveEditorFilePath(undefined), undefined);
});
