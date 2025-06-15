const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const Redis = require('ioredis'); // Use the 'ioredis' library here
const app = express();
const port = process.env.PORT || 3001;
const CACHE_EXPIRY_SECONDS = 3600; // Cache expiry time (1 hour)


// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
const redisClient = new Redis({
  host: 'more-boxer-32895.upstash.io', // ❌ Remove "https://"
  port: 6379,
  password: 'AYB_AAIjcDE2NTMyZjlhYjVjY2U0YmRjOTlmMWQzOGVhYjY1YjM0ZHAxMA',
  tls: {} // Upstash requires TLS
});
// GitHub API configuration
const githubApiConfig = {
  headers: {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
};

const fetchRecentActivity = async (owner, repo) => {
  try{

  
  const [issuesResponse, prsResponse] = await Promise.all([
    axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=5&sort=updated`, githubApiConfig),
    axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=5&sort=updated`, githubApiConfig)
  ]);

  const recentIssues = issuesResponse.data
    .filter(issue => !issue.pull_request) // Exclude PRs from issues
    .map(issue => ({
      title: issue.title,
      url: issue.html_url,
      updatedAt: issue.updated_at
    }));

  const recentPRs = prsResponse.data.map(pr => ({
    title: pr.title,
    url: pr.html_url,
    updatedAt: pr.updated_at
  }));

  return { recentIssues, recentPRs }}
  catch(error){
handleGitHubRateLimitError(error)
throw error
  }
};

const fetchLanguages = async (owner, repo) => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, githubApiConfig);
    const languages =Object.keys(response.data)
    return languages[0]

}

const fetchGoodFirstIssues = async ()=>{
  try {
    const sevenDaysAgo = new Date(Date.now() - 30* 24 * 60 * 60 * 1000);
       const formatedData = sevenDaysAgo.toISOString().split('T')[0]
    const { data } = await axios.get(

      'https://api.github.com/search/issues',{
        params:{
          q:`label:"good first issue" created:>${formatedData} state:open  `,
          sort:'updated',
          order:'desc',
          per_page:40
        },...githubApiConfig
      }
    )
    return data;
  } catch (error) {
    console.error('Error fetching global repos:', error.message);
    throw error;
   
  }
}
const fetchGlobalRepos = async () => {
  try {
    const { data } = await axios.get(
      'https://api.github.com/search/repositories',
      {
        params: {
          q: ' stars:>1000',
         
          sort: 'updated',
          order: 'desc',
          per_page: 50 // Fetch more to filter
        },
        ...githubApiConfig
      }
    );

    const activeRepos = await Promise.all(
      data.items.map(async (repo) => {
        const [{ recentIssues, recentPRs },languages] = await Promise.all([
            fetchRecentActivity(repo.owner.login, repo.name),
            fetchLanguages(repo.owner.login,repo.name)  
        ]) 
        // Check if there's been activity in the last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const hasRecentActivity = [...recentIssues, ...recentPRs].some(
          item => new Date(item.updatedAt) > sevenDaysAgo
        );

        if (hasRecentActivity) {
          return {
            name: repo.name,
            owner: repo.owner.login,
            url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updatedAt: repo.updated_at,
            recentIssues,
            recentPRs,
            languages
          };
        }
        return null;
      })
    );

    return activeRepos.filter(Boolean).slice(0, 50); // Return up to 10 active repos
  } catch (error) {
    console.error('Error fetching global repos:', error.message);
    throw error;
  }
};
const fetchReposByLanguage = async (language) => {
  try {
    const { data } = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: `language:${language} stars:>1000`,
        sort: 'updated',
        order: 'desc',
        per_page: 30
      },
      ...githubApiConfig
    });

    const activeRepos = await Promise.all(
      data.items.map(async (repo) => {
        const [{ recentIssues, recentPRs }, languages] = await Promise.all([
          fetchRecentActivity(repo.owner.login, repo.name),
          fetchLanguages(repo.owner.login, repo.name)
        ]);

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const hasRecentActivity = [...recentIssues, ...recentPRs].some(
          (item) => new Date(item.updatedAt) > sevenDaysAgo
        );

        if (hasRecentActivity) {
          return {
            name: repo.name,
            owner: repo.owner.login,
            url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updatedAt: repo.updated_at,
            recentIssues,
            recentPRs,
            languages
          };
        }
        return null;
      })
    );

    return activeRepos.filter(Boolean).slice(0, 30); // Return up to 10 active repos
  } catch (error) {
    console.error(`Error fetching ${language} repos:`, error.message);
    throw error;
  }
};
app.get('/api/active-issues',async(req,res)=>{
try {
  const catchKey = req.originalUrl;
  const cachedRepos = await redisClient.get(catchKey)
 
  if(cachedRepos){
    console.log('from redis')
    return res.json(JSON.parse(cachedRepos))
  
  }
  const issues = await fetchGoodFirstIssues()
  await redisClient.set(catchKey,JSON.stringify(issues),'EX',CACHE_EXPIRY_SECONDS)
  res.json(issues)

} catch (error) {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Failed to fetch data', message: error.message });

}  

})
app.get('/api/repo/:language',async(req,res)=>{
  const {language} = req.params;
  try {
    const catchKey= req.originalUrl
    const catchedRepo = await redisClient.get(catchKey)
    if(catchedRepo){
      console.log("from redis")
return res.json(JSON.parse(catchedRepo))
    }
    const repo = await fetchReposByLanguage(language);
    console.log('from api')
    await redisClient.set(catchKey,JSON.stringify(repo),'EX',CACHE_EXPIRY_SECONDS)
    res.json(repo)
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Failed to fetch data', message: err.message });
  }
})

app.get('/api/active-repos', async (req, res) => {
  try {
    const cachkey = req.originalUrl
    const cachedRepos = await redisClient.get(cachkey)
    if(cachedRepos){
      console.log('fetching from redis')
      return res.json(JSON.parse(cachedRepos))
      
    }
    const repos = await fetchGlobalRepos();
    console.log('fetching from api ')
    await redisClient.set(cachkey,JSON.stringify(repos),'EX',CACHE_EXPIRY_SECONDS)
    res.json(repos)
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Failed to fetch data', message: err.message });
  }
});




// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});
const keepAlive = () => {
  const url = 'https://openlang-backend-pcy1.onrender.com';
  setInterval(async () => {
    try {
      const response = await fetch(url);
      console.log('Keep-alive ping sent, status:', response.status);
    } catch (error) {
      console.error('Keep-alive ping failed:', error);
    }
  }, 36000000); // 12 hours
};

keepAlive();
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// Test the server


