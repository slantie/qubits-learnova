
Now I have implemented all my features into the project, 

Now I want to host my entire backend into one Oracle Ubuntu Server, I want to use a single docker componse file to start and stop my backend services. 

For that I have to create backend-cicd.yml file. Frontend will be hosted on the vercel so it is not the issue. 

Now our task is to create a single Docker compose file that will restart the entire backend each time we are pushing the code. 

You generate a .env.prod for both server and streaming-service. also add them into .gitignore. 

Make sure for the client website, the domain name will be: learnova.vercel.app
And for the backend we will attach a domain name with it. 
Domain name will be: apilearnova.harshdodiya.tech

We have to configure it with nginx and also cert for https

Now give me these things: 
- A single docker file for starting entire backend
- backend-cicd.yml that will each time SSH and restart my backend service
- from the single dockerfile, I will start the entire backend into my ubuntu for the first time. 
- will add the production environment variables as well. (You have to create it as well)
- find all the env and locations where you have used localhost as of now and we have to change it to actual production URLs. 
- Give me all the steps for the same. 
- nginx and cert commands. 


- also mention if anything else is required for the backend setup