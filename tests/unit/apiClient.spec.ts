import { expect, test } from "@playwright/test";
import { ApiClient, toCurl, withQuery } from "../../src/http/apiClient.js";
import { FakeRequestContext } from "./fakes.js";

const BASE_URL = "https://api.example.com/api/v3/";

function makeClient(): { client: ApiClient; fake: FakeRequestContext } {
  const fake = new FakeRequestContext();
  return { client: new ApiClient(fake.context, BASE_URL, { apiKey: "test-key" }), fake };
}

test("url joins without double slashes", () => {
  const { client } = makeClient();

  expect(client.baseUrl).toBe("https://api.example.com/api/v3");
  expect(client.url("/content/things")).toBe("https://api.example.com/api/v3/content/things");
  expect(client.url("content/things")).toBe("https://api.example.com/api/v3/content/things");
});

test("api key header is added", async () => {
  const { client, fake } = makeClient();

  await client.get("content/things");

  expect(client.defaultHeaders).toEqual({ "api-key": "test-key" });
  expect(fake.last.options.headers).toEqual({ "api-key": "test-key" });
});

test("explicit headers win over defaults", async () => {
  const { client, fake } = makeClient();

  await client.get("content/things", { headers: { "api-key": "other", "X-Trace": "1" } });

  expect(fake.last.options.headers).toEqual({ "api-key": "other", "X-Trace": "1" });
});

test("withoutAuth shares the context but drops credentials", async () => {
  const { client, fake } = makeClient();

  const anonymous = client.withoutAuth();
  await anonymous.post("content/things", { name: "x" });

  expect(fake.calls).toHaveLength(1);
  expect(fake.last.options.headers).toEqual({});
  expect(anonymous.baseUrl).toBe(client.baseUrl);
  expect(anonymous.timeoutMs).toBe(client.timeoutMs);
});

test("verbs pass method, body, params and timeout", async () => {
  const { client, fake } = makeClient();

  await client.get("a", { params: { q: 1 } });
  await client.post("b", { k: "v" });
  await client.patch("c", { k: "v" });
  await client.put("d", { k: "v" });
  await client.delete("e");

  expect(fake.calls.map((call) => call.options.method)).toEqual([
    "GET",
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
  ]);
  expect(fake.calls[0]?.options.params).toEqual({ q: 1 });
  expect(fake.calls[1]?.options.data).toEqual({ k: "v" });
  expect(fake.calls[4]?.options).not.toHaveProperty("data");
  for (const call of fake.calls) {
    expect(call.options.timeout).toBe(client.timeoutMs);
    expect(call.options.failOnStatusCode).toBe(false);
  }
});

test("falsy json bodies are sent", async () => {
  // Negative tests send `false`, `0` and `[]` as bodies; they must not be dropped.
  const { client, fake } = makeClient();
  const bodies = [false, 0, [], {}, ""];

  for (const body of bodies) {
    await client.post("content/things", body);
  }

  expect(fake.calls.map((call) => call.options.data)).toEqual(bodies);
});

test("a request attaches a masked curl repro and the body", async () => {
  const { client } = makeClient();
  const before = test.info().attachments.length;

  await client.post("content/things", { name: "x" }, { headers: { Cookie: "session=secret" } });

  const attachments = test.info().attachments.slice(before);
  expect(attachments.map((attachment) => attachment.name)).toEqual([
    "curl POST content/things",
    "Request body",
  ]);
  const curl = attachments[0]?.body?.toString() ?? "";
  expect(curl).toContain("curl -X POST 'https://api.example.com/api/v3/content/things'");
  expect(curl).toContain('-d \'{"name":"x"}\'');
  expect(curl).not.toContain("test-key");
  expect(curl).not.toContain("secret");
  expect(JSON.parse(attachments[1]?.body?.toString() ?? "null")).toEqual({ name: "x" });
});

test("attach: false still sends but attaches nothing", async () => {
  const { client, fake } = makeClient();
  const before = test.info().attachments.length;

  await client.post("content/things", { name: "x" }, { attach: false });

  expect(fake.calls).toHaveLength(1);
  expect(test.info().attachments).toHaveLength(before);
});

test("GET bodies are left out of the curl repro", async () => {
  const { client } = makeClient();
  const before = test.info().attachments.length;

  await client.get("content/things", { params: { page: 2 } });

  const attachments = test.info().attachments.slice(before);
  expect(attachments.map((attachment) => attachment.name)).toEqual(["curl GET content/things"]);
  expect(attachments[0]?.body?.toString()).toContain("content/things?page=2");
});

test("withQuery encodes params and leaves bare urls alone", () => {
  expect(withQuery("https://x.test/a")).toBe("https://x.test/a");
  expect(withQuery("https://x.test/a", {})).toBe("https://x.test/a");
  expect(withQuery("https://x.test/a", { q: "a b", n: 1, f: false })).toBe(
    "https://x.test/a?q=a+b&n=1&f=false",
  );
});

test("toCurl escapes single quotes", () => {
  const curl = toCurl("POST", "https://x.test/a", { "X-Name": "it's" }, { text: "it's" });

  expect(curl).toContain("-H 'X-Name: it'\\''s'");
  expect(curl).toContain("-d '{\"text\":\"it'\\''s\"}'");
});
