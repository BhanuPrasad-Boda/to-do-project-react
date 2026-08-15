import { LOCAL_API_URL, PRODUCTION_API_URL, resolveApiUrl } from "./apiBase";

test("uses localhost in development and Render on the live site", () => {
  expect(resolveApiUrl({ envUrl: "", hostname: "localhost" })).toBe(LOCAL_API_URL);
  expect(resolveApiUrl({ envUrl: "", hostname: "to-do-project-react-one.vercel.app" })).toBe(PRODUCTION_API_URL);
  expect(resolveApiUrl({ envUrl: "https://custom.example/api/", hostname: "localhost" })).toBe("https://custom.example/api");
});
