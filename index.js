const util = require('util');
const msRestAzure = require('ms-rest-azure');
const NetworkManagementClient = require('azure-arm-network');
const computeManagementClient = require('azure-arm-compute');


const subscriptionId = process.env["subscriptionID"];
const resourceGroup = process.env["resourceGroup"];
const tenant_id = process.env["tenant_id"];
const app_id = process.env["app_id"];
const app_secret = process.env["app_secret"];
const nsg = process.env["securityGroup"];

var ipconfigParm;


module.exports = async function (context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    src_ip = context.bindings.req.body.data.rawlog.srcip;
    stringtest = JSON.stringify(src_ip)
    resp = {
        'isBase64Encoded' : false,
        'statusCode': 200,
        'headers': { "Content-Type": "application/json" },
        'body': ''
};


   var getNics = await getVMs();


function updateSecurityGroup(resourceGroup, nic,params){
//Update the Security Group.
    msRestAzure
    .loginWithServicePrincipalSecret(app_id,app_secret, tenant_id)
    .then(credentials => {
    const client = new NetworkManagementClient(credentials, subscriptionId);
    return client.networkInterfaces.createOrUpdate(resourceGroup,nic,params);
     })
   }

async function getNics(nic){
//different login types here: https://github.com/Azure/azure-sdk-for-node/tree/master/runtime/ms-rest-azure
//exceptions need to be done on this
    msRestAzure
    .loginWithServicePrincipalSecret(app_id, app_secret, tenant_id)
    .then(credentials => {
    const client = new NetworkManagementClient(credentials, subscriptionId);
    client.networkInterfaces.get(resourceGroup,nic,(async function (err, result) {
        if (err) {
          console.log(util.format('\n Error  ' +
            'the current subscription:\n%s', util.inspect(err, { depth: null })));
        } else {
           try{
           ipLocation = result.ipConfigurations[0].publicIPAddress.id
           console.log(result.ipConfigurations[0].publicIPAddress.id);
            var indexItem = ipLocation;
            var lastindex = indexItem.lastIndexOf('/');
            var ipName = indexItem.substring(lastindex +1);

///Parameters for security group update
            ipconfigParm = result.ipConfigurations[0]
            const params = {
              location: "East US 2",
              networkSecurityGroup :{

                  id:nsg,
                  location:"East US 2",

              },
               ipConfigurations: [ipconfigParm]
                       };

            listAllPublicIPs(ipName,nic,params);
            return nic;
           }
           catch(err){
            console.log("Error, probably doesn't exsist. Error message: "+ err)
            }
        }
    }));

})};

    function listAllPublicIPs (ipName,nic,params) {
        msRestAzure
        .loginWithServicePrincipalSecret(app_id, app_secret, tenant_id)
        .then(credentials => {
         const networkClient = new NetworkManagementClient(credentials,subscriptionId);
        console.log('\n Find Public IPs');
        networkClient.publicIPAddresses.get(resourceGroup,ipName,((function (err, result) {
          if (err) {
            console.log(util.format('\n Error listing Public IPs ' +
              'the current subscription:\n%s', util.inspect(err, { depth: null })));

          } else {
            if (result.ipAddress == src_ip ){
              updateSecurityGroup(resourceGroup,nic,params);
              return nic
            }
            else{
              console.log("IpAddress: " + src_ip +" Not found")
              return -1;
            }
        }

        })));
        })
    };
   async function getVMs (callback) {
    msRestAzure
    .loginWithServicePrincipalSecret(app_id, app_secret, tenant_id,callback)
    .then(credentials => {
     const networkClient = new computeManagementClient(credentials,subscriptionId);
    console.log('\n List IPs under the resource group.');
     networkClient.virtualMachines.list(resourceGroup,(async function (err, result) {
      if (err) {
        console.log(util.format('\n Error  ' +
          'the current subscription:\n%s', util.inspect(err, { depth: null })));
      } else {
          astring = JSON.stringify(result);
          var list1 = [];
          var list2 = [];
          for (var i = 0; i <result.length; i++){
            var object = result[i];
            list1.push(object.networkProfile.networkInterfaces[0].id);
          }
          for(j in list1){
              var indexItem = list1[j];
              var lastindex = indexItem.lastIndexOf('/');
              var result = indexItem.substring(lastindex +1);
              list2.push(result);
        }
            for (k in list2){
              getNics(list2[k]);
             }
        return list2;
        }
    }));
});
   };
