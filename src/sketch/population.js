import { Perceptron, LSTM } from "neataptic/src/architecture/architect";
import Network from "neataptic/src/architecture/network";
import { Agent } from "./agent";
import { ACC_DATA, NUM_AREAS } from "./config";

function getNN() {
    const nn = new Perceptron(NUM_AREAS + 2, 15, NUM_AREAS + 1)
    // using lstm set clear to true in settings
    //const nn = new LSTM(NUM_AREAS + 2, 15, NUM_AREAS + 1)
    nn.score = 0
    return nn
}

const trainigs_options = {
    log: 1000,
    error: 0.03,
    iterations: 1000,
    rate: .3,
    shuffle: true,
    momentum: 0.9,
    clear: false, // true when using LSTM
}

const logScoreDistribution = (explorationData) => {
    const distrib = {}
    explorationData.forEach(d => {
        if (d.score in distrib) {
            distrib[d.score] += 1
        } else {
            distrib[d.score] = 1
        }
    })
    console.log(distrib)
}

export class Population {
    constructor(popSize, s) {
        this.popSize = popSize
        this.generation = 0
        this.agent = new Agent(s, getNN())
        this.bestExpScore = 0
        this.bestScore = -1

        this.explorationData = []
        this.trainingsData = []

        this.spawnPositions = [
            this.agent.areasLeft[Math.floor(this.agent.areasLeft.length / 2)],
            this.agent.areasLeft[0].copy().sub(s.createVector(0, 75)),
            this.agent.areasLeft[this.agent.areasLeft.length - 1].copy().sub(s.createVector(0, 75)),
        ]

        this.bestAgent = new Agent(s, Network.fromJSON(this.agent.nn.toJSON()))
        this.bestAgent.spawnPositions = this.spawnPositions
        this.agent.spawnPositions = this.spawnPositions
    }

    train(sketch) {
        logScoreDistribution(this.explorationData)

        const best = this.explorationData.reduce((acc, e) => e.score > acc ? e.score : acc, -1)

        // exploration data had higher score
        if (best > 0 && best >= this.bestExpScore) {
            this.bestExpScore = best
            if (ACC_DATA) {
                // accumulate data of best runs
                this.trainingsData = this.trainingsData.concat(this.explorationData.find(entry => entry.score == best).data)
            } else {
                // use only data of best run for trainig
                this.trainingsData = this.explorationData.find(entry => entry.score == best).data
            }
            console.log(`TD length: ${this.trainingsData.length}`)
        }

        if (this.trainingsData.length > 0 && this.bestScore < this.bestExpScore) {
            // Get a new network and train on current dataset
            this.agent.nn = getNN()
            const alldata = this.trainingsData.reduce((acc, e) => { return [...acc, ...e] }, [])
            this.agent.nn.train(alldata, trainigs_options)
        }

        this.reset(sketch)
        this.explorationData = []
    }

    runBest() {
        this.agent.nn = Network.fromJSON(this.bestAgent.nn.toJSON())
        this.reset()
    }

    reset(sketch) {
        this.agent.nn.score = 0
        this.agent.init(sketch)
    }
}