import { test, expect } from './test.mjs';

test('agents can discover and read complete dated content without running JavaScript', async ({request}) => {
  const home=await request.get('/');
  expect(await home.text()).toContain('href="/agent/index.md"');
  const discovery=await request.get('/llms.txt');
  expect(discovery.ok()).toBe(true);
  expect(await discovery.text()).toContain('https://mapsf.net/agent/index.md');
  const index=await request.get('/agent/index.md');
  expect(index.headers()['content-type']).toContain('text/plain');
  const indexText=await index.text();
  expect(indexText).toContain('# MapSF agent mode');
  const dates=[...new Set([...indexText.matchAll(/\/agent\/(\d{4}-\d{2}-\d{2})\.md/g)].map(match=>match[1]))];
  expect(dates).toHaveLength(30);
  for (const date of [dates[0],dates.at(-1)]) {
    const md=await request.get(`/agent/${date}.md`);
    const json=await request.get(`/agent/${date}.json`);
    expect(md.ok()).toBe(true);
    expect(json.ok()).toBe(true);
    const data=await json.json();
    const text=await md.text();
    expect(data.date).toBe(date);
    expect(data.timeZone).toBe('America/Los_Angeles');
    expect(text).toContain(`## Events (${data.events.length})`);
    expect(text).toContain(`## Free Places (${data.freePlaces.length})`);
    expect(text).toContain(`Coverage: ${data.coverage}`);
    expect(text).not.toContain('<!DOCTYPE html>');
  }
  const sources=await request.get('/agent/sources.md');
  expect(await sources.text()).toContain('## Free Places schedule providers');
  expect((await request.get('/agent/1900-01-01.md')).status()).toBe(404);
});
