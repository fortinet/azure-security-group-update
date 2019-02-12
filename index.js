'use strict';
const util = require('util');
const msRestAzure = require('ms-rest-azure');
const NetworkManagementClient = require('azure-arm-network');
const computeManagementClient = require('azure-arm-compute');
const {
    SUBSCRIPTION_ID,
    RESOURCE_GROUP,
    TENANT_ID,
    REST_APP_ID,
    REST_APP_SECRET,
    QUARANTINE_SECURITY_GROUP
} = process.env;

const QUARANTINE_SECURITY_GROUP_FQDN = `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Network/networkSecurityGroups/${QUARANTINE_SECURITY_GROUP}`;
var ipconfigParm;
var src_ip;
var isPrivateIP;

module.exports = async function(context, req) {
    context.log('JavaScript HTTP trigger function processed a request.');
    try {
        src_ip = req.body.data.rawlog.srcip;
        isPrivateIP = isPrivateIp(src_ip);
    } catch (err) {
        context.log(`Error Retrieving the Source IP${err}`);
    }

    context.log(`IP Received: ${src_ip}`);
    const credentials = await msRestAzure.loginWithServicePrincipalSecret(REST_APP_ID, REST_APP_SECRET, TENANT_ID);
    var nicList = await getNicList();
    var data = await getMatchingNicAndParams(nicList);
    if (data) {
        var matchingNic = data[0];
        var updateParams = data[1];
        try {
            await updateSecurityGroup(RESOURCE_GROUP, matchingNic, updateParams);
        } catch (err) {
            context.log(err);
        }
    } else {
        context.log('IP not Found');
    }

    /**
     * Update the Security Group.
     * Will replace current security group.
     */
    async function updateSecurityGroup(RESOURCE_GROUP, nic, params) {
        const client = new NetworkManagementClient(credentials, SUBSCRIPTION_ID);
        try {
            var updateNic = await client.networkInterfaces.createOrUpdate(RESOURCE_GROUP, nic, params);

            if (updateNic.networkSecurityGroup.id === QUARANTINE_SECURITY_GROUP_FQDN) {
                console.log(`Updated Security Group for ${nic}`);
            } else {
                throw new error(`Unable to update security group: ${QUARANTINE_SECURITY_GROUP_FQDN} on nic: ${JSON.stringify(nic)}`);
            }
        } catch (err) {
            console.log(`Error updating the security group: ${err.toString()}`);
            throw err;
        }
    }

    async function getMatchingNicAndParams(niclist) {
        const client = new NetworkManagementClient(credentials, SUBSCRIPTION_ID);
        try {
            for (let nic of niclist) {
                var result = await client.networkInterfaces.get(RESOURCE_GROUP, nic);
                if (result && result.ipConfigurations) {
                    for (let networkData of result.ipConfigurations) {
                        ipconfigParm = result.ipConfigurations;
                        var regionName = result.location;
                        // Parameters for security group update
                        const params = {
                            location: regionName,
                            networkSecurityGroup: {
                                id: QUARANTINE_SECURITY_GROUP_FQDN
                            },
                            ipConfigurations: ipconfigParm
                        };
                        if (isPrivateIP === true) {
                            if (networkData.privateIPAddress === src_ip) {
                                return [nic, params];
                            }
                        } else {
                            if (networkData.publicIPAddress) {
                                var [ipName] = networkData.publicIPAddress.id.split('/').slice(-1);
                                var publicIP = await getPublicIp(ipName);
                                if (publicIP === src_ip) {
                                    context.log(`${publicIP} Found`);
                                    return [nic, params];
                                }

                            }
                        }
                    }
                }
            }
        } catch (error) {
            context.log(util.format('\n Error  the current subscription:\n%s', util.inspect(err, {
                depth: null
            })));
        }
    }

    async function getPublicIp(ipName) {
        const networkClient = new NetworkManagementClient(credentials, SUBSCRIPTION_ID);
        try {
            var result = await networkClient.publicIPAddresses.get(RESOURCE_GROUP, ipName);
            return result && result.ipAddress;
        } catch (error) {
            context.log(util.format('\n Error listing Public IPs ' +
                'the current subscription:\n%s', util.inspect(err, {
                depth: null
            })));
        }
    }

    async function getNicList() {
        const networkClient = new computeManagementClient(credentials, SUBSCRIPTION_ID);
        var result = await networkClient.virtualMachines.list(RESOURCE_GROUP);
        try {
            var list1 = [];
            var list2 = [];
            for (var i = 0; i < result.length; i++) {
                var object = result[i];
                for (let NetworkData of object.networkProfile.networkInterfaces) {
                    list1.push(NetworkData.id);
                }
            }
            for (var j in list1) {
                var indexItem = list1[j];
                var lastindex = indexItem.lastIndexOf('/');
                var result = indexItem.substring(lastindex + 1);
                list2.push(result);
            }
            return (list2);
        } catch (err) {
            context.log(util.format('\n Error  ' +
                'the current subscription:\n%s', util.inspect(err, {
                depth: null
            })));
        }

    }

    function isPrivateIp(IPaddress) {
        var SplitIP = IPaddress.split('.');
        if (SplitIP[0] === '10' ||
            (SplitIP[0] === '172' && (parseInt(SplitIP[1], 10) >= 16 && parseInt(SplitIP[1], 10) <= 31)) ||
            (SplitIP[0] === '192' && SplitIP[1] === '168')) {
            return true;
        } else {
            return false;
        }
    }
};
