# Issue Jo Mene Face Kre
1. Phele To Ye At the Time of Dynamic Load balancer mutiple process are running
concurrently so whenever i push some data on the redis pub subs model a single data leads to generation of 4 data beacuse every cluster working simuntanously over here which creates a problem of storing these huge data in redis as well as in queue also

2. Second things i face out that which library or if there exist some other mechanism to generate the unqiue api key and secret hash for the users but i came up with the crypto module but i was looking somethings different but at last i used crypto module for api key generating and hash secret

3. Third thing i face out is how we are able to generate the user , file , api , analaysis unqiue id to figure them out one thing i came up that either we can use date with milliseconds time but thats not an apporpriate for this so again crypto help us to generate the random bytes for user which are unqiue in nature in future we can also implement our own algorithm

4. Next things is that basically i have to figure out whats param should be taken to generate the signed url for the so the best things is to take user id and its api secret hash for the same we can apply the digital signature to that and send back to it but the issue i faced in that i was able to create the signed url but only with 2 data that was not enough for backend and future presective for the same reason i also append the filePath and exp polciy to the signed url

5. One Toughest problem for me is to veirfy the signed url as a fresher in backend developer i send the signed url to the client as exp policy is also the part i have mention above the exp with Date.now() which return the number but when we are sending the data it becomes string as i have make the aspi_secret with Number(exp) and at the time of verification i was verifying the payload with String(exp) which total chnages the hash code from crypto this this me as 35 Min to solve it out but i figure out the problem by own but for confirmation i do chatgpt and kimi and yes its the problem of type casting at data sharing between network

6. Another Problem i faced is for acheiving the smoothness and scalabilty basically i used string key value data structure of redis to put the signature of current signed url with so that we i can first match the signature from cache server instead of making an api call to database for fetching the api secret then create hash code for verififcation beacuse it may possible that api sercet may be modify by client this help me to reuce the no of db calls by 7% and latecy by 2%

7. After successful files upload with end destination the another problem was if the file contains virus or its an malicious or suspicious file in this scenarios it can be harmful for the server so i created i redis pub sub model for real time and faster deleivy of the message from api server to BullMq Services and queue services runs at background for virus scan as soon as the queue find its and dangrous file it instantly remove it from the server and after that Append a log in data base for the same

---
Yeah i am currently also implementing the on process virus scan check service without receivng that file on the server but this lead me to a higher cost and more complex logic still trying....

