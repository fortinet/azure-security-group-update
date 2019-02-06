# Intro
This Azure Function works with a FortiGate Automation Action  to change the security group of a requested VM to one specified in an environment variable.
The function uses Node.js and requires that the resource group be set as an environment variable.
It works by first fetching information on all the VM's in a resource group, querying their respective network cards and then their attached Public IP Addresses.

    Note: If you have more than one network card attached to a VM this function will not change the security group of all of them, only the network card with the associated IP address.

# Set Up the Azure Function:
    This function uses Service Principal to authenticate, information on setting up a service principal can be found here: https://docs.microsoft.com/en-us/javascript/azure/node-sdk-azure-authenticate-principal?view=azure-node-latest
    Additional coding samples can be found here: https://github.com/Azure/azure-sdk-for-node/blob/master/Documentation/Authentication.md

  1. Create a Function APP and select JavaScript as the Runtime Stack
  2. Create a new Function and Select **HTTP trigger**
  3. Select the Authorization Level
  4. Ensure the dependencies are installed:

          ms-rest-azure
          azure-arm-network
          azure-arm-compute
  5. Copy the code into the function or deploy via Visual Studio code
  6. Under Application Settings in your Function create the following variables and set them with the appropriate value

          subscriptionId - Your Subscription ID
          resourceGroup - The Resource Group in which the VMs are located
          tenant_id - Domain Or Tenant ID
          app_id  - Client or App ID
          app_secret - Password or Secret
          nsg - the Network Security Group you want to use to quarantine VMs


# Set Up the FortiGate

  1. Set up your FortiGate by selecting **Security Fabric** and then **Automation.**
  2. Select **Compromised Host** as the **Trigger**
  3. Select **Azure Function** as the application
  4. Set the action parameters, with the **API Gateway** and settings generated in the previous section. Example shown below

  ![picture](./imgs/FortigateExampleScreenshot.png)





 # Support
 Fortinet-provided scripts in this and other GitHub projects do not fall under the regular Fortinet technical support scope and are not supported by FortiCare Support Services.
 For direct issues, please refer to the [Issues](https://github.com/fortinet/aws-lambda-vpc-security-group-update/issues) tab of this GitHub project.
 For other questions related to this project, contact [github@fortinet.com](mailto:github@fortinet.com).

 ## License
 [License](./LICENSE) © Fortinet Technologies. All rights reserved.
