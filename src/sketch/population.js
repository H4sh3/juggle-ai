import { Perceptron } from "neataptic/src/architecture/architect";
import Network from "neataptic/src/architecture/network";
import { Agent } from "./agent";

function getNN(sketch) {
    const nn = new Perceptron(10, 15, 9)
    //nn.connections.map(c => c.weight = sketch.random(-1, 1))
    nn.score = 0
    nn.prevScore = 0
    return nn
}


export class Population {
    constructor(popSize, sketch) {
        this.popSize = popSize
        this.generation = 0
        this.agent = new Agent(sketch, getNN(sketch))
        this.bestExpScore = 0
        this.bestScore = -1

        this.explorationData = []
        this.trainingsData = []

        this.bestAgent = new Agent(sketch, Network.fromJSON(this.agent.nn.toJSON()))
    }

    train(sketch) {
        const distrib = {}
        this.explorationData.forEach(d => {
            if (d.score in distrib) {
                distrib[d.score] += 1
            } else {
                distrib[d.score] = 1
            }
        })
        console.log(distrib)
        console.log(this.explorationData.length)
        const best = this.explorationData.reduce((acc, e) => e.score > acc ? e.score : acc, -1)
        //console.log({ best })

        // better exploration
        if (best > 0 && best >= this.bestExpScore) {
            //this.trainingsData = this.trainingsData.concat(this.explorationData.find(entry => entry.score == best).data)
            this.trainingsData = this.explorationData.find(entry => entry.score == best).data
            this.bestExpScore = best
            console.log(`TD length: ${this.trainingsData.length}`)
            //this.bestScore = best
        }


        if (this.trainingsData.length > 0 && this.bestScore < this.bestExpScore) {
            console.log("Training!")
            this.agent.nn = getNN() // Network.fromJSON(this.bestAgent.nn.toJSON()) 
            const options = {
                log: 1000,
                error: 0.001,
                iterations: 10000,
                rate: .3,
                //shuffle: true,
                //batchSize: Math.ceil(this.trainingsData / 10),
                //momentum: 0.9
            }
            const before = this.agent.nn.activate(this.trainingsData[0][0].input)
            const target = this.trainingsData[0][0].output
            const alldata = this.trainingsData.reduce((acc, e) => { return [...acc, ...e] }, [])
            console.log(alldata)
            this.agent.nn.train(alldata, options)
            const after = this.agent.nn.activate(this.trainingsData[0][0].input)
            //console.log(`Before ${before}`)
            //console.log(`Target ${target}`)
            //console.log(`After ${after}`)
        }

        this.reset(sketch)

        this.explorationData = []
    }

    runBest(s) {
        this.agent = new Agent(s, Network.fromJSON(this.bestAgent.nn.toJSON()))
    }

    reset(sketch) {
        this.agent.nn.score = 0
        this.agent.initPosEtc(sketch)
    }

    evaluate(sketch) {
        this.agents.sort((a, b) => a.score() > b.score() ? -1 : 0)
        console.log(`Highscore: ${this.agents[0].score()}`)

        // best 20% unchanged
        const best20Perc = []

        for (let i = 0; i < this.popSize * 0.2; i++) {
            best20Perc.push(new Agent(sketch, this.agents[i].nn, this.agents[i].nnRight))
        }

        const newAgents = [...best20Perc]

        // 20% new agents
        for (let i = 0; i < this.popSize * 0.2; i++) {
            newAgents.push(new Agent(sketch, getNN(sketch), getNN(sketch)))
        }

        // Fill rest with mutations of best 20%
        while (newAgents.length < this.popSize) {
            const randomAgent = sketch.random(best20Perc)

            const nnL = Network.fromJSON(randomAgent.nn.toJSON())
            nnL.prevScore = randomAgent.nn.score
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