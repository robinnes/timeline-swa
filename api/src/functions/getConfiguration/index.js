module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    },
    body: {
      environment: process.env.APP_ENVIRONMENT
    }
  };
};