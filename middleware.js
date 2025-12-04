import { next } from '@vercel/edge';

export const config = {
  matcher: '/:path*', // 仅保护首页，或者用 '/:path*' 保护所有页面
};

export default function middleware(request) {
  const authorizationHeader = request.headers.get('Authorization');

  if (authorizationHeader) {
    // 你的用户名和密码 (格式为 base64 编码的 username:password)
    // 这里的示例是 admin:password
    // 你可以在浏览器控制台运行 btoa('admin:password') 来获取你的 base64 字符串
    const basicAuth = authorizationHeader.split(' ')[1];
    
    // 把 'YWRtaW46cGFzc3dvcmQ=' 替换成你自己的 base64 编码
    // 或者更好的是使用环境变量: atob(basicAuth) === process.env.BASIC_AUTH_CREDENTIALS
    if (basicAuth === 'YWRtaW46cGFzc3dvcmQ=') {
      return next();
    }
  }

  return new Response('Please provide a valid credentials', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}