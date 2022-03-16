import axios from "axios";

const stackshareApiToken = 'ju1h6vhhc4dNq2F2uj7rrQ';

const getCompaniesUsingSlack = async () => {
  try {
    const query = `{
      leads(usingToolSlugs: ["slack"], toolMatch: "any",
      after:""){
        count
        pageInfo {
          endCursor
          startCursor
        }
        edges{
          
          node{
            companyId
            companyName
            domain
            companyTools {
              edges {
                node {              
                  tool{
                    name
                    slug
                  }
                  
                  sources
                  sourcesSummary
                }
              }
            }
          }
        }
      }
    }`

    const headers = {
      'x-api-key': stackshareApiToken
    };

    let companyInfo = await axios({
      url: 'https://api.stackshare.io/graphql',
      method: 'post',
      headers,
      data: {
        query
      }
    })
    
    companyInfo = companyInfo.data.data.leads;
    let numCompanies = companyInfo.count;
    let allCompanies = [];

    companyInfo.edges.forEach(edge => {
      let data = edge.node;
      let company = {
        company_id: data.companyId,
        company_name: data.companyName,
        domain: data.domain
      }
      allCompanies.push(company)
    })

    console.log(allCompanies);
  } catch(error) {
    console.error(error);
  }
}


getCompaniesUsingSlack();