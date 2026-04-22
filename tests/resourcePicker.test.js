const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildResourceQuickPickItems,
  filterDiscoveredResources,
  normalizePickedResources,
  pickResources,
} = require('../out/resourcePicker.js');

test('filterDiscoveredResources keeps only SKILL.md files for skill mode', () => {
  assert.deepEqual(
    filterDiscoveredResources('skill', [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\extensions\\helper.ts',
    ]),
    ['C:\\repo\\.pi\\skills\\review\\SKILL.md']
  );
});

test('filterDiscoveredResources excludes SKILL.md from template mode', () => {
  assert.deepEqual(
    filterDiscoveredResources('template', [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\README.md',
      'C:\\repo\\.pi\\extensions\\helper.ts',
    ]),
    [
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\README.md',
    ]
  );
});

test('filterDiscoveredResources keeps only TypeScript files for extension mode', () => {
  assert.deepEqual(
    filterDiscoveredResources('extension', [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\extensions\\helper.ts',
      'C:\\repo\\script.js',
    ]),
    ['C:\\repo\\.pi\\extensions\\helper.ts']
  );
});

test('normalizePickedResources maps selected SKILL.md files to parent directories', () => {
  assert.deepEqual(
    normalizePickedResources('skill', [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\skills\\refactor\\SKILL.md',
    ]),
    [
      'C:\\repo\\.pi\\skills\\review',
      'C:\\repo\\.pi\\skills\\refactor',
    ]
  );
});

test('normalizePickedResources keeps template files unchanged', () => {
  assert.deepEqual(
    normalizePickedResources('template', [
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\prompts\\fix.md',
    ]),
    [
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\prompts\\fix.md',
    ]
  );
});

test('normalizePickedResources keeps extension files unchanged', () => {
  assert.deepEqual(
    normalizePickedResources('extension', [
      'C:\\repo\\.pi\\extensions\\one.ts',
      'C:\\repo\\.pi\\extensions\\one.ts',
      'C:\\repo\\.pi\\extensions\\two.ts',
    ]),
    [
      'C:\\repo\\.pi\\extensions\\one.ts',
      'C:\\repo\\.pi\\extensions\\two.ts',
    ]
  );
});

test('buildResourceQuickPickItems uses readable labels and relative-path descriptions', () => {
  assert.deepEqual(
    buildResourceQuickPickItems('skill', ['C:\\repo\\.pi\\skills\\review\\SKILL.md'], (file) => file.replace('C:\\repo\\', '')),
    [
      {
        label: 'review',
        description: '.pi\\skills\\review\\SKILL.md',
        path: 'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      },
    ]
  );

  assert.deepEqual(
    buildResourceQuickPickItems('template', ['C:\\repo\\.pi\\prompts\\review.md'], (file) => file.replace('C:\\repo\\', '')),
    [
      {
        label: 'review',
        description: '.pi\\prompts\\review.md',
        path: 'C:\\repo\\.pi\\prompts\\review.md',
      },
    ]
  );

  assert.deepEqual(
    buildResourceQuickPickItems('extension', ['C:\\repo\\.pi\\extensions\\helper.ts'], (file) => file.replace('C:\\repo\\', '')),
    [
      {
        label: 'helper.ts',
        description: '.pi\\extensions\\helper.ts',
        path: 'C:\\repo\\.pi\\extensions\\helper.ts',
      },
    ]
  );
});

test('pickResources filters template paths before showing the picker', async () => {
  let seenItems = [];

  const result = await pickResources('template', {
    discoveredPaths: [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\extensions\\helper.ts',
    ],
    toRelativePath: (file) => file.replace('C:\\repo\\', ''),
    showQuickPick: async (items) => {
      seenItems = items;
      return [items[0]];
    },
  });

  assert.deepEqual(seenItems.map((item) => item.path), ['C:\\repo\\.pi\\prompts\\review.md']);
  assert.deepEqual(result, ['C:\\repo\\.pi\\prompts\\review.md']);
});

test('pickResources filters extension paths before showing the picker', async () => {
  let seenItems = [];

  const result = await pickResources('extension', {
    discoveredPaths: [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\prompts\\review.md',
      'C:\\repo\\.pi\\extensions\\helper.ts',
    ],
    toRelativePath: (file) => file.replace('C:\\repo\\', ''),
    showQuickPick: async (items) => {
      seenItems = items;
      return [items[0]];
    },
  });

  assert.deepEqual(seenItems.map((item) => item.path), ['C:\\repo\\.pi\\extensions\\helper.ts']);
  assert.deepEqual(result, ['C:\\repo\\.pi\\extensions\\helper.ts']);
});

test('pickResources returns an empty list without opening a picker when no matching resources are discovered', async () => {
  let pickerCalls = 0;

  const result = await pickResources('template', {
    discoveredPaths: ['C:\\repo\\.pi\\skills\\review\\SKILL.md'],
    toRelativePath: (file) => file,
    showQuickPick: async () => {
      pickerCalls += 1;
      return [];
    },
  });

  assert.deepEqual(result, []);
  assert.equal(pickerCalls, 0);
});

test('pickResources returns undefined when the user cancels the picker', async () => {
  const result = await pickResources('template', {
    discoveredPaths: ['C:\\repo\\.pi\\prompts\\review.md'],
    toRelativePath: (file) => file,
    showQuickPick: async () => undefined,
  });

  assert.equal(result, undefined);
});

test('pickResources returns normalized multi-select results', async () => {
  const result = await pickResources('skill', {
    discoveredPaths: [
      'C:\\repo\\.pi\\skills\\review\\SKILL.md',
      'C:\\repo\\.pi\\skills\\refactor\\SKILL.md',
    ],
    toRelativePath: (file) => file.replace('C:\\repo\\', ''),
    showQuickPick: async (items) => [items[0], items[0], items[1]],
  });

  assert.deepEqual(result, [
    'C:\\repo\\.pi\\skills\\review',
    'C:\\repo\\.pi\\skills\\refactor',
  ]);
});
