Run railway up frontend --path-as-root --ci --service="$RAILWAY_FRONTEND_SERVICE"
  railway up frontend --path-as-root --ci --service="$RAILWAY_FRONTEND_SERVICE"
  shell: /usr/bin/bash -e {0}
  env:
    RAILWAY_TOKEN: 
    RAILWAY_FRONTEND_SERVICE: 
Invalid RAILWAY_TOKEN. Please check that it is valid and has access to the resource you're trying to use.
Error: Process completed with exit code 1.