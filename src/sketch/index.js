
import Network from 'neataptic/src/architecture/network';
import { Agent, getKey } from './agent';
import { height, width } from './config';
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
  button.position(0, 0);
  button.mousePressed(() => {
    epoch = 0
  })

  const button2 = s.createButton('endless train');
  button2.position(0, 25);
  button2.mousePressed(() => {
    endlessTrain = !endlessTrain

    if (!endlessTrain) {
      i = 0
      population.runBest(s)
    }
  })

  const button3 = s.createButton('run endless');
  button3.position(0, 50);
  button3.mousePressed(() => {
    endlessRun = !endlessRun
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

      if (population.agent.ballsDropped() || population.agent.ballCollision) {
        break
      }

      i += 1
    }
    return population.agent.nn.score
  }


  s.draw = () => {
    s.background(220, 220, 220, 30);
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
          // trained agent performces better -> use it for future epochs
          population.bestScore = score
          population.bestAgent = new Agent(s, Network.fromJSON(population.agent.nn.toJSON()))
          population.bestAgent.spawnPositions = population.spawnPositions.map(p => p.copy())
          console.log(`Score ${population.bestAgent.nn.score}`)
        } else {
          population.agent = new Agent(s, Network.fromJSON(population.bestAgent.nn.toJSON()))
          population.agent.spawnPositions = population.spawnPositions.map(p => p.copy())
        }

        population.reset(s)
        epoch = 1
      }

      i = 0
      while (i < (MAX_ITERATIONS + population.bestScore * 100) && !population.agent.ballsDropped() && !population.agent.ballCollision) {
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


    if ((i == MAX_ITERATIONS && !endlessRun) || population.agent.ballsDropped() || population.agent.ballCollision) {
      //population.train(s)
      population.reset(s)
      i = 0
      //epoch += 1
    }
    population.agent.update(s, false, i)
    i += 1

    //renderHand(s, population.agent.handLeft, population.agent.handRadius)
    //renderHand(s, population.agent.handRight, population.agent.handRadius)
    population.agent.balls.forEach((b, i) => renderBall(s, b, i))

    s.fill(0)
    s.text(population.agent.nn.score, 150, 150)
  }
}


const renderBall = (s, ball, i) => {
  if (i === 0) {
    s.fill(255, 0, 0)
  }
  if (i === 1) {
    s.fill(0, 255, 0)
  }
  if (i === 2) {
    s.fill(0, 0, 255)
  }
  s.noStroke()
  s.ellipse(ball.pos.x, ball.pos.y, ball.radius, ball.radius)
}

const drawError = (s, error) => {
  let prev = error[0]
  s.push()
  s.translate(150, 150)
  for (let i = 1; i < error.length; i++) {
    const current = error[i]
    s.line(i - 1, prev, i, current)
    prev = current
  }
  s.pop()
}

const renderArea = (s, areas) => {
  areas.forEach(a => {
    s.fill(255)
    s.ellipse(a.x, a.y, 5, 5)
  })
}