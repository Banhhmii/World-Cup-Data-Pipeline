const { loggingMiddleware } = require("./logging");

describe("loggingMiddleware", () => {
  it("logs the request method and URL, then calls next()", () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const req = { method: "GET", url: "/players" };
    const res = {};
    const next = jest.fn();

    loggingMiddleware(req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("GET"));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("/players"));
    expect(next).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
