import { Neataptic } from "neataptic";
import { Agent } from './agent'
/** Rename vars */
var Neat = Neataptic.Neat;
var Methods = Neataptic.methods;
var Config = Neataptic.Config;
var Architect = Neataptic.Architect;


// GA settings
var AGENT_AMOUNT = 500;
var ITERATIONS = 250;
var MUTATION_RATE = .6;

// Trained population
var USE_TRAINED_POP = true;

/** Construct the genetic algorithm */
export function initNeat() {
    const neat = new Neat(
        5, 3,
        (g) => { return g.score },
        {
            mutation: [
                Methods.mutation.MOD_WEIGHT,
                //Methods.mutation.ADD_NODE,
                //Methods.mutation.SUB_NODE,
                //Methods.mutation.ADD_CONN,
                //Methods.mutation.SUB_CONN,
                //Methods.mutation.MOD_BIAS,
                //Methods.mutation.MOD_ACTIVATION,
                //Methods.mutation.ADD_GATE,
                //Methods.mutation.SUB_GATE,
                //Methods.mutation.ADD_SELF_CONN,
                //Methods.mutation.SUB_SELF_CONN,
                //Methods.mutation.ADD_BACK_CONN,
                //Methods.mutation.SUB_BACK_CONN
            ],
            popsize: AGENT_AMOUNT,
            mutationRate: MUTATION_RATE,
        }
    );
    /* 
        if (USE_TRAINED_POP) {
            neat.population = population;
        } */

    // Draw the first graph
    //drawGraph(neat.population[0].graph($('.best').width() / 2, $('.best').height() / 2), '.best');
    return neat
}

/** Start the evaluation of the current generation */
export function startEvaluation(s, neat) {
    const agents = [];

    for (var genome in neat.population) {
        genome = neat.population[genome];
        agents.push(new Agent(s, genome, s.createVector(100, 250)))
    }

    return agents
}

/** End the evaluation of the current generation */
export function endEvaluation(s, neat, agents) {
    neat.population = agents.map(a => a.nn)
    console.log('Generation:', neat.generation, '- average score:', Math.round(neat.getAverage()));
    console.log('Fittest score:', Math.round(neat.getFittest().score));

    // Networks shouldn't get too big
    //    for (var genome in neat.population) {
    //        genome = neat.population[genome];
    //        genome.score -= genome.nodes.length * SCORE_RADIUS / 10;
    //    }

    // Sort the population by score
    neat.evolve()
    return startEvaluation(s, neat);
}