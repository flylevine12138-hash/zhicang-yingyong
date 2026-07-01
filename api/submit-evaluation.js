/**
 * 智舱测 · 评测数据提交接口 (Vercel Serverless Function)
 *
 * 接收评测数据 → 写入 GitHub 仓库的 data/evaluations.json
 * 
 * 环境变量: GITHUB_TOKEN (GitHub Personal Access Token)
 */
export default async function handler(req, res) {
  // CORS 头
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').end();
  }

  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const evalData = req.body;

    // 基础校验
    if (!evalData || !evalData.brand || !evalData.city) {
      return res.status(400).json({ error: '缺少必要字段: brand, city' });
    }

    // GitHub 配置
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
    if (!GITHUB_TOKEN) {
      return res.status(500).json({ error: '服务端未配置 GITHUB_TOKEN' });
    }

    const OWNER = 'flylevine12138-hash';
    const REPO = 'zhicang-yingyong';
    const FILE_PATH = 'data/evaluations.json';

    // 1. 获取当前文件内容和 SHA
    const getRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'zhicangce-api',
        },
      }
    );

    if (!getRes.ok) {
      const errText = await getRes.text();
      console.error('GitHub API 获取文件失败:', getRes.status, errText);
      return res.status(500).json({ error: '获取数据文件失败', detail: `${getRes.status}` });
    }

    const fileData = await getRes.json();
    let currentContent;
    try {
      currentContent = JSON.parse(atob(fileData.content));
    } catch (e) {
      currentContent = [];
    }
    const sha = fileData.sha;

    // 2. 追加新数据
    const newRecord = {
      ...evalData,
      submitted_at: new Date().toISOString(),
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    };
    currentContent.push(newRecord);

    // 3. 提交更新到 GitHub
    const updateRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'zhicangce-api',
        },
        body: JSON.stringify({
          message: `评测数据: ${newRecord.brand} - ${newRecord.city} - ${new Date().toISOString().slice(0,10)}`,
          content: btoa(unescape(encodeURIComponent(JSON.stringify(currentContent, null, 2)))),
          sha: sha,
          branch: 'main',
        }),
      }
    );

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('GitHub API 提交失败:', updateRes.status, errText);
      return res.status(500).json({ error: '写入数据失败', detail: `${updateRes.status}` });
    }

    // 成功响应
    return res.status(200).json({
      success: true,
      id: newRecord.id,
      message: '评测数据已成功提交'
    });

  } catch (e) {
    console.error('处理请求异常:', e.message);
    return res.status(500).json({ error: e.message });
  }
}
