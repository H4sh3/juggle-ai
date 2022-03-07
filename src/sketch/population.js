import { Perceptron } from "neataptic/src/architecture/architect";
import Network from "neataptic/src/architecture/network";
import { Agent } from "./agent";

function getNN(sketch) {
    const nn = new Perceptron(5, 2, 3)
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
            const agent = new Agent(sketch, getNN(sketch))
            this.agents.push(agent)
        }
    }

    evaluate(sketch) {
        const networks = this.agents.map(a => a.nn)
        networks.sort((a, b) => a.score > b.score ? -1 : 0)
        var fittest = Network.fromJSON(networks[0].toJSON());
        fittest.score = networks[0].score;
        console.log(`Highscore: ${fittest.score}`)

        // best 20% unchanged
        const best20Perc = []

        for (let i = 0; i < this.popSize * 0.2; i++) {
            const nn = networks[i]
            nn.prevScore = nn.score
            nn.score = 0
            best20Perc.push(nn)
        }

        const newNetworks = [...best20Perc]

        // 20% new random networks
        for (let i = 0; i < this.popSize * 0.2; i++) {
            newNetworks.push(getNN(sketch))
        }

        // Fill rest with mutations of best 20%
        while (newNetworks.length < this.popSize) {
            const network = Network.fromJSON(sketch.random(best20Perc).toJSON())
            network.score = 0
            network.prevScore = 0
            const mutMethode = {
                name: 'MOD_WEIGHT',
                min: -1,
                max: 1
            }
            network.mutate(mutMethode)
            newNetworks.push(network)
        }

        // Initialize new agents with selected/mutated networks
        this.agents = newNetworks.map(nn => new Agent(sketch, nn))

        this.generation++;
    }
}