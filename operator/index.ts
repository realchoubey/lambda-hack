import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { delegationABI } from "./abis/delegationABI";
import { contractABI } from './abis/contractABI';
import { registryABI } from './abis/registryABI';
import { avsDirectoryABI } from './abis/avsDirectoryABI';
import express, { NextFunction } from 'express';
import rootRouter from "./rust/crates/operator/src/routes/root";
import webRouter from "./rust/crates/operator/src/routes/web/index"
import Constant from "./rust/crates/operator/src/lib/Constant";
import Postgres from "./rust/crates/operator/src/lib/Postgres";
dotenv.config();

const app = express();
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);

const delegationManagerAddress = process.env.DELEGATION_MANAGER_ADDRESS!;
const contractAddress = process.env.CONTRACT_ADDRESS!;
const stakeRegistryAddress = process.env.STAKE_REGISTRY_ADDRESS!;
const avsDirectoryAddress = process.env.AVS_DIRECTORY_ADDRESS!;

const delegationManager = new ethers.Contract(delegationManagerAddress, delegationABI, wallet);
const contract = new ethers.Contract(contractAddress, contractABI.abi, wallet);
const registryContract = new ethers.Contract(stakeRegistryAddress, registryABI, wallet);
const avsDirectory = new ethers.Contract(avsDirectoryAddress, avsDirectoryABI, wallet);

const signAndRespondToTask = async (taskIndex: number, taskCreatedBlock: number, taskName: string, query: string) => {
    const message = `Hello, ${taskName}`;
    const messageHash = ethers.utils.solidityKeccak256(["string"], [message]);
    const messageBytes = ethers.utils.arrayify(messageHash);
    const signature = await wallet.signMessage(messageBytes);

    console.log(
        `Signing and responding to task ${taskIndex}`
    )

    // const tx = await contract.respondToTask(
    //     { name: taskName, taskCreatedBlock: taskCreatedBlock, query: query },
    //     taskIndex,
    //     signature
    // );
    // await tx.wait();
    console.log(`Responded to task. QueryString:`, query);
};

const registerOperator = async () => {
    try {
        const tx1 = await delegationManager.registerAsOperator({
            earningsReceiver: await wallet.address,
            delegationApprover: "0x0000000000000000000000000000000000000000",
            stakerOptOutWindowBlocks: 0
        }, "");
        await tx1.wait();
        console.log("Operator registered on EL successfully");



        const salt = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        const expiry = Math.floor(Date.now() / 1000) + 3600; // Example expiry, 1 hour from now

        // Define the output structure
        let operatorSignature = {
            expiry: expiry,
            salt: salt,
            signature: ""
        };

        // Calculate the digest hash using the avsDirectory's method
        const digestHash = await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
            wallet.address,
            contract.address,
            salt,
            expiry
        );

        // Sign the digest hash with the operator's private key
        const signingKey = new ethers.utils.SigningKey(process.env.PRIVATE_KEY!);
        const signature = signingKey.signDigest(digestHash);

        // Encode the signature in the required format
        operatorSignature.signature = ethers.utils.joinSignature(signature);

        const tx2 = await registryContract.registerOperatorWithSignature(
            wallet.address,
            operatorSignature
        );
        await tx2.wait();
        console.log("Operator registered on AVS successfully");
    } catch (error) {
        console.log("operator has already registered");
    }
};

const monitorNewTasks = async () => {
    contract.on("NewTaskCreated", async (taskIndex: number, task: any) => {
        console.log(`New task detected: Hello, ${task.name}`);
        console.log(`New task query: Query, ${task.query}`);
        await signAndRespondToTask(taskIndex, task.taskCreatedBlock, task.name, task.query);
    });

    console.log("Monitoring for new tasks...");
};

const startExpressServer = async () => {

    const connected = await Postgres.checkDBConnection();
    if (!connected) {
        console.error(`App::Unable to stabilize database connection`);
        process.exit(1);
    } else {
        console.log(`App:Database connection stabilized`);
    }

    const port = Constant.expressPort;
    const host = Constant.host;
    app.set('port', port);
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    app.use('/', rootRouter);
    app.use('/web', handleCreateRunQueryTask, webRouter);

    app.use((req: any, res: any) => {
        return res.status(400).json({ msg: 'Resource not found' });
    });

    process.title = "Server started";
    app.listen(port, function () {
        console.info(`App::${process.title} at http://${host}:${port}`);
    }).on('error', () => {
        console.error(`App::Encountering an issue while starting server.`);
        process.exit(1);
    });
};

const handleCreateRunQueryTask = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
        console.log("body", req?.body);
        const taskName = req?.body?.name;
        const query = req?.body?.sql;
        const manualGasLimit = req?.body?.gasLimit;

        //Estimate Gas
        let gasLimit;

        if (manualGasLimit) {
            gasLimit = ethers.BigNumber.from(manualGasLimit);
        } else {
            try {
                // Estimate the gas required
                const estimatedGas = await contract.estimateGas.createNewTask(taskName, query);
                // Use twice the estimated gas as a safe limit
                gasLimit = estimatedGas.mul(ethers.BigNumber.from(2));
                console.log("Estimated gasLimit::", gasLimit)
            } catch (estimationError) {
                console.error("Gas estimation failed:", estimationError);
                // Fallback to a default gas limit if estimation fails
                gasLimit = ethers.BigNumber.from("500000");
            }
        }

        console.log("Final GasLimit::", gasLimit)

        const tx = await contract.createNewTask(taskName, query, { gasLimit: gasLimit });
        console.log("Created Tasked RunQuery")

        // // Wait for the transaction to be mined
        const receipt = await tx.wait();
        console.log(`Tx hash for RunQueryTask: ${receipt.transactionHash}`);
    } catch (error: any) {
        console.error("Error while creating and running query task:", error);
    }

    next();
};

const main = async () => {
    await registerOperator();

    await startExpressServer();

    monitorNewTasks().catch((error) => {
        console.error("Error monitoring tasks:", error);
    });
};

main().catch((error) => {
    console.error("Error in main function:", error);
});
