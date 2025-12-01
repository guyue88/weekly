// middleware.js

// 配置你的访问密码
const PASSWORD = "123456";

export function middleware(req) {
  const url = new URL(req.url);

  // 已登录（有正确 cookie）
  const cookie = req.cookies.get("token");
  if (cookie && cookie === PASSWORD) {
    return; // 放行
  }

  // 携带 password=xxxx 参数
  const inputPassword = url.searchParams.get("password");
  if (inputPassword === PASSWORD) {
    const res = Response.redirect(url.origin + url.pathname);
    res.headers.append(
      "Set-Cookie",
      `token=${PASSWORD}; Path=/; HttpOnly; Max-Age=${7 * 24 * 60 * 60}`
    );
    return res;
  }

  // 未验证，渲染密码输入页
  return new Response(
    `
      <!DOCTYPE html>
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h2>请输入访问密码</h2>
          <form method="GET">
            <input 
              type="password" 
              name="password"
              placeholder="密码"
              style="padding: 8px; font-size: 16px;"
            />
            <button 
              style="padding: 8px 16px; font-size: 16px; margin-left: 10px;"
              type="submit"
            >
              进入
            </button>
          </form>
        </body>
      </html>
    `,
    { headers: { "Content-Type": "text/html" } }
  );
}

// matcher：保护所有页面（包括 `/`），但排除 Next.js 内部路径
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico).*)'
  ]
};
