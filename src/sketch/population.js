import { Perceptron } from "neataptic/src/architecture/architect";
import Network from "neataptic/src/architecture/network";
import { Agent } from "./agent";

function getNN(sketch) {
    const nn = new Perceptron(4, 3, 2)
    nn.connections.map(c => c.weight = sketch.random(-1, 1))
    nn.score = 0
    nn.prevScore = 0
    return nn
}


export class Population {
    constructor(popSize, sketch) {
        this.popSize = popSize
        this.generation = 0
        this.agents = []
        while (this.agents.length < popSize) {
            const agent = new Agent(sketch, getNN(sketch), getNN(sketch))
            this.agents.push(agent)
        }
    }

    evaluate(sketch) {
        this.agents.sort((a, b) => a.score() > b.score() ? -1 : 0)
        console.log(`Highscore: ${this.agents[0].score()}`)

        // best 20% unchanged
        const best20Perc = []

        for (let i = 0; i < this.popSize * 0.2; i++) {
            best20Perc.push(new Agent(sketch, this.agents[i].nnLeft, this.agents[i].nnRight))
        }

        const newAgents = [...best20Perc]

        // 20% new agents
        for (let i = 0; i < this.popSize * 0.2; i++) {
            newAgents.push(new Agent(sketch, getNN(sketch), getNN(sketch)))
        }

        // Fill rest with mutations of best 20%
        while (newAgents.length < this.popSize) {
            const randomAgent = sketch.random(best20Perc)

            const nnL = Network.fromJSON(randomAgent.nnLeft.toJSON())
            nnL.prevScore = randomAgent.nnLeft.score
            nnL.score = 0

            const nnR = Network.fromJSON(randomAgent.nnRight.toJSON())
            nnR.prevScore = randomAgent.nnRight.score
            nnR.score = 0

            const mutMethode = {
                name: 'MOD_WEIGHT',
                min: -1,
                max: 1
            }
            nnL.mutate(mutMethode)
            nnR.mutate(mutMethode)
            newAgents.push(new Agent(sketch, nnL, nnR))
        }

        // Initialize new agents with selected/mutated networks

        this.agents = newAgents

        this.generation++;
    }
}