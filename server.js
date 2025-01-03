const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// GitHub API configuration
const githubApiConfig = {
  headers: {
    'Authorization': `token ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json'
  }
};

const fetchRecentActivity = async (owner, repo) => {
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

  return { recentIssues, recentPRs };
};
const fetchLanguages = async (owner, repo) => {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/languages`, githubApiConfig);
    const languages =Object.keys(response.data)
    return languages[0]

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
          per_page: 20 // Fetch more to filter
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

    return activeRepos.filter(Boolean).slice(0, 20); // Return up to 10 active repos
  } catch (error) {
    console.error('Error fetching global repos:', error.message);
    throw error;
  }
};

const fetchTsRepo = async () => {
    try {
      const { data } = await axios.get(
        'https://api.github.com/search/repositories',
        {
          params: {
            q: 'language:typescript stars:>1000',
           
            sort: 'updated',
            order: 'desc',
            per_page: 10 // Fetch more to filter
          },
          ...githubApiConfig
        }
      );
  
      const activeRepos = await Promise.all(
        data.items.map(async (repo) => {
          const [{ recentIssues, recentPRs }] = await Promise.all([
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
              
            };
          }
          return null;
        })
      );
  
      return activeRepos.filter(Boolean).slice(0, 10); // Return up to 10 active repos
    } catch (error) {
      console.error('Error fetching global repos:', error.message);
      throw error;
    }
  };  



  const fetchJsRepo = async () => {
    try {
      const { data } = await axios.get(
        'https://api.github.com/search/repositories',
        {
          params: {
            q: 'language:javascript stars:>1000',
           
            sort: 'updated',
            order: 'desc',
            per_page: 10 // Fetch more to filter
          },
          ...githubApiConfig
        }
      );
  
      const activeRepos = await Promise.all(
        data.items.map(async (repo) => {
          const [{ recentIssues, recentPRs }] = await Promise.all([
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
              
            };
          }
          return null;
        })
      );
  
      return activeRepos.filter(Boolean).slice(0, 10); // Return up to 10 active repos
    } catch (error) {
      console.error('Error fetching global repos:', error.message);
      throw error;
    }
  };

  const fetchPythonRepo = async () => {
    try {
      const { data } = await axios.get(
        'https://api.github.com/search/repositories',
        {
          params: {
            q: 'language:python stars:>1000',
           
            sort: 'updated',
            order: 'desc',
            per_page: 10 // Fetch more to filter
          },
          ...githubApiConfig
        }
      );
  
      const activeRepos = await Promise.all(
        data.items.map(async (repo) => {
          const [{ recentIssues, recentPRs }] = await Promise.all([
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
              
            };
          }
          return null;
        })
      );
  
      return activeRepos.filter(Boolean).slice(0, 10); // Return up to 10 active repos
    } catch (error) {
      console.error('Error fetching global repos:', error.message);
      throw error;
    }
  };

  const fetchCRepo = async () => {
    try {
      const { data } = await axios.get(
        'https://api.github.com/search/repositories',
        {
          params: {
            q: 'language:C stars:>1000',
           
            sort: 'updated',
            order: 'desc',
            per_page: 10 // Fetch more to filter
          },
          ...githubApiConfig
        }
      );
  
      const activeRepos = await Promise.all(
        data.items.map(async (repo) => {
          const [{ recentIssues, recentPRs }] = await Promise.all([
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
              
            };
          }
          return null;
        })
      );
  
      return activeRepos.filter(Boolean).slice(0, 10); // Return up to 10 active repos
    } catch (error) {
      console.error('Error fetching global repos:', error.message);
      throw error;
    }
  };

  const fetchGoLangRepo = async () => {
    try {
      const { data } = await axios.get(
        'https://api.github.com/search/repositories',
        {
          params: {
            q: 'language:go stars:>1000',
           
            sort: 'updated',
            order: 'desc',
            per_page: 10 // Fetch more to filter
          },
          ...githubApiConfig
        }
      );
  
      const activeRepos = await Promise.all(
        data.items.map(async (repo) => {
          const [{ recentIssues, recentPRs }] = await Promise.all([
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
              
            };
          }
          return null;
        })
      );
  
      return activeRepos.filter(Boolean).slice(0, 10); // Return up to 10 active repos
    } catch (error) {
      console.error('Error fetching global repos:', error.message);
      throw error;
    }
  };


app.get('/api/active-repos', async (req, res) => {
  try {
    const repos = await fetchGlobalRepos();
    res.json(repos);
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Failed to fetch data', message: err.message });
  }
});

app.get('/api/ts-repo',async(req,res)=>{
    try {
        const repos =await fetchTsRepo()
        res.json(repos)
    } catch (error) {
        console.log('server error:',err)
        res.status(500).json({error:'failed to fetch data',message:err.message})
    }
})

app.get('/api/js-repo',async(req,res)=>{
    try {
        const repos =await fetchJsRepo()
        res.json(repos)
    } catch (error) {
        console.log('server error:',err)
        res.status(500).json({error:'failed to fetch data',message:err.message})
    }
})

app.get('/api/python-repo',async(req,res)=>{
    try {
        const repos =await fetchPythonRepo()
        res.json(repos)
    } catch (error) {
        console.log('server error:',err)
        res.status(500).json({error:'failed to fetch data',message:err.message})
    }
})

app.get('/api/c-repo',async(req,res)=>{
    try {
        const repos =await fetchCRepo()
        res.json(repos)
    } catch (error) {
        console.log('server error:',err)
        res.status(500).json({error:'failed to fetch data',message:err.message})
    }
})

app.get('/api/go-repo',async(req,res)=>{
    try {
        const repos =await fetchGoLangRepo()
        res.json(repos)
    } catch (error) {
        console.log('server error:',err)
        res.status(500).json({error:'failed to fetch data',message:err.message})
    }
})
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));

// Test the server
(async () => {
  try {
    const response = await axios.get('http://localhost:3001/api/active-repos');
    // console.log('Fetched active repos:', response.data);
  } catch (error) {
    console.error('Error testing server:', error.message);
  }
})();

