const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const sourceBetween = (start, end) => {
  const offset = html.indexOf(start);
  assert.notEqual(offset, -1);
  const finish = html.indexOf(end, offset);
  assert.notEqual(finish, -1);
  return html.slice(offset, finish);
};

test('photo prompts preserve the holding-and-pointing pose across styles and variations', () => {
  const context = vm.createContext({ CONFIG: { event: { productBrand: 'Brand' } } });
  vm.runInContext(sourceBetween('function buildPhotoPrompt(', 'function buildInfographicPrompt('), context);
  const product = { name: 'Snack', image: 'reference', ingredientEn: 'coconut and chocolate' };
  for (const id of ['snowglobe', 'adface', 'blocky', 'factory', 'space', 'popart']) {
    const prompt = context.buildPhotoPrompt(product, { id, prompt: 'Scene: {product} with {ingredient}.' }, 1);
    assert.match(prompt, /exactly one hand holds a single product package/);
    assert.match(prompt, /other hand points its index finger/);
    assert.match(prompt, /fingers stay away from the logo and label/);
    assert.match(prompt, /preserve its exact silhouette/);
    assert.match(prompt, /Brand Snack with coconut and chocolate/);
    assert.match(prompt, /keeping the same one-hand-holds, other-hand-points pose/);
    assert.doesNotMatch(prompt, /\{product\}|\{ingredient\}/);
    if (id === 'blocky') assert.match(prompt, /blocky voxel character/);
    else if (id === 'popart') assert.match(prompt, /pop-art comic character/);
    else assert.match(prompt, /3D vinyl\/clay character figurine/);
  }
});

test('live and demo photos omit left-hand captions but retain the product thumbnail', async () => {
  const pack = {};
  const bands = [];
  const canvas = { getContext: () => ({ save() {}, restore() {} }), toDataURL: () => 'image' };
  const context = vm.createContext({
    makeCanvas: () => canvas,
    loadImage: async () => ({}),
    packImage: async () => pack,
    mulberry32: () => () => 0,
    hashStr: () => 0,
    PHOTO_RENDERERS: { snowglobe() {} },
    coverDraw() {},
    drawBrandBand: (_g, _w, _h, options) => bands.push(options),
  });
  vm.runInContext(sourceBetween('async function renderPhotoMock(', '/* ---------- Kariyer infografi'), context);
  await context.renderPhotoMock({ photo: 'reference', product: { id: 'snack' }, theme: { id: 'snowglobe' } });
  await context.composePhoto('generated', { id: 'snack' });
  assert.equal(bands.length, 2);
  for (const options of bands) {
    assert.equal(options.pack, pack);
    assert.equal(options.title, undefined);
    assert.equal(options.sub, undefined);
  }
});

test('inline application and gallery scripts parse', () => {
  for (const name of ['index.html', 'samples.html']) {
    const content = fs.readFileSync(path.join(__dirname, name), 'utf8');
    for (const match of content.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1]);
  }
});

test('gallery combines version, experience and search filters and displays empty results', () => {
  class Element {
    constructor(value = '') { this.value = value; this.children = []; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    addEventListener() {}
  }
  const nodes = Object.fromEntries(['version', 'kind', 'search', 'gallery', 'count', 'empty']
    .map(id => [`#${id}`, new Element(id === 'version' || id === 'kind' ? 'all' : '')]));
  const content = fs.readFileSync(path.join(__dirname, 'samples.html'), 'utf8');
  const scripts = [...content.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  const context = vm.createContext({ document: {
    querySelector: selector => nodes[selector],
    createElement: () => new Element(),
  } });
  vm.runInContext(scripts.at(-1)[1], context);
  nodes['#search'].value = 'Reklam';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 2);
  nodes['#version'].value = 'promotional';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 1);
  nodes['#kind'].value = 'career';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 0);
  assert.equal(nodes['#empty'].hidden, false);
  nodes['#version'].value = 'baseline';
  nodes['#search'].value = '';
  context.render();
  assert.equal(nodes['#gallery'].children.length, 1);
  assert.equal(nodes['#empty'].hidden, true);
});
