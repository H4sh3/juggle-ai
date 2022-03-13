
import Network from 'neataptic/src/architecture/network';
import { Agent, calcAngle, getBall, getKey } from './agent';
import { GRAVITY, height, width } from './config';
import { Population } from './population';

export const inView = (pos) => {
  return pos.y < height &&
    pos.y > 0 &&
    pos.x > 0 &&
    pos.x < width
}

export default function sketch(s) {
  let backgroundColor;

  let i = 0
  let epoch = 0
  let MAX_ITERATIONS = 500
  let endlessTrain = true
  let endlessRun = false

  const button = s.createButton('reset epoch');
  button.position(10, 10);
  button.mousePressed(() => {
    epoch = 0
  })

  const button2 = s.createButton('endless train');
  button2.position(10, 35);
  button2.mousePressed(() => {
    endlessTrain = !endlessTrain

    endlessRun = !endlessTrain
    if (endlessRun) {
      i = 0
      population.runBest(s)
    }
  })

  const population = new Population(10, s)
  population.bestScore = 0

  s.setup = () => {
    s.createCanvas(width, height);
    backgroundColor = s.color(s.random(255), s.random(255), s.random(255));
  };


  const runEpoch = () => {
    population.reset(s)
    i = 0
    while (i < MAX_ITERATIONS + population.bestScore * 100) {
      population.agent.update(s, -1, i) // no random actions

      if (population.agent.ballDropped() || population.agent.ballCollision) {
        break
      }

      i += 1
    }
    return population.agent.nn.score
  }

  s.draw = () => {
    s.background(130, 130, 130, 30);
    renderArea(s, population.agent.areasLeft)
    renderArea(s, population.agent.areasRight)

    while (endlessTrain && population.bestScore < 100) {
      population.reset(s)

      if (epoch == 100) {
        population.train(s)

        //eval after training to see how the agent performance
        const score = runEpoch()

        console.log(`Eval: ${score} Best: ${population.bestScore} BestExpl: ${population.bestExpScore}`)
        if (score >= population.bestScore) {
          // trained agent performced better -> use it for future epochs
          population.bestScore = score
          console.log(`Score ${score}`)
          population.bestAgent.nn = Network.fromJSON(population.agent.nn.toJSON())
          population.bestAgent.init()
        } else {
          population.agent.nn = Network.fromJSON(population.bestAgent.nn.toJSON())
          population.agent.init()
        }

        population.reset(s)
        epoch = 1
      }

      i = 0
      while (i < (MAX_ITERATIONS + population.bestScore * 100) && !population.agent.ballDropped() && !population.agent.ballCollision) {
        let rate = s.map(epoch, 1, MAX_ITERATIONS + population.bestScore * 100, 0.1, 0.6)
        population.agent.update(s, rate, i)
        i += 1
      }

      population.explorationData.push({
        score: population.agent.nn.score,
        data: population.agent.data
      })

      epoch += 1
      s.background(220, 220, 220);
      break
    }

    if (!endlessTrain) {
      if ((i == MAX_ITERATIONS && !endlessRun) || population.agent.ballDropped() || population.agent.ballCollision) {
        population.reset(s)
        i = 0
      }
      population.agent.update(s, false, i)
      i += 1

      population.agent.balls.forEach((b, i) => renderBall(s, b, i))
    }

    s.fill(0)
    s.text(`Score: ${population.agent.nn.score}`, width - 70, 16)
    s.text(`Best: ${population.bestScore}`, width - 70, 32)
  }
}

const colorDict = {
  0: (s) => { s.fill(255, 0, 0) },
  1: (s) => { s.fill(0, 255, 0) },
  2: (s) => { s.fill(0, 0, 255) }
}

const renderBall = (s, ball, i) => {
  colorDict[i](s)
  s.noStroke()
  s.ellipse(ball.pos.x, ball.pos.y, ball.radius, ball.radius)
}

const renderArea = (s, areas) => {
  areas.forEach(a => {
    s.fill(255)
    s.ellipse(a.x, a.y, 5, 5)
  })
}