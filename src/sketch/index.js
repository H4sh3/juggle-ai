
import { height, width } from './config';
import { Population } from './population';

export const inView = (pos) => {
  return pos.y < height &&
    pos.y > 0 &&
    pos.x > 0 &&
    pos.x < width
}

const allDropped = (agents) => {
  return agents.find(a => !a.ballDropped) == undefined
}

export default function sketch(s) {
  let backgroundColor;

  let i = 0
  let epoch = 0
  let ITERATIONS = 1000

  const population = new Population(100, s)

  s.setup = () => {
    s.createCanvas(width, height);
    backgroundColor = s.color(s.random(255), s.random(255), s.random(255));
  };

  const hidden = 1000

  s.draw = () => {
    s.background(120, 120, 120, 30);

    while (epoch < hidden) {
      if (i == ITERATIONS || allDropped(population.agents)) {
        population.evaluate(s)
        i = 0
        epoch += 1
      }

      population.agents.forEach(a => a.update(s))
      i += 1
    }

    if (i == ITERATIONS || allDropped(population.agents)) {
      population.evaluate(s)
      i = 0
      epoch += 1
    }
    population.agents.forEach(a => a.update(s))
    i += 1

    if (epoch > hidden - 1) {
      population.agents.sort((a, b) => (a.nnLeft.prevScore > b.nnLeft.prevScore && a.nnRight.prevScore > b.nnRight.prevScore) ? -1 : 0)
      const a = population.agents[0]
      renderHand(s, a.handLeft, a.handRadius)
      renderHand(s, a.handRight, a.handRadius)
      a.balls.forEach(b => renderBall(s, b))

      //population.agents.forEach(a => {
      //  renderHand(s, a.handLeft, a.handRadius)
      //  renderHand(s, a.handRight, a.handRadius)
      //})
      //population.agents.forEach(a => {
      //  a.balls.forEach(b => renderBall(s, b))
      //})
    }
  };
}

const renderHand = (s, hand, radius) => {
  s.fill(255)
  s.ellipse(hand.x, hand.y, radius, radius)
}

const renderBall = (s, ball) => {
  s.fill(0, 255, 0)
  s.ellipse(ball.pos.x, ball.pos.y, ball.radius, ball.radius)
}

// https://github.com/wagenaartje/target-seeking-ai/blob/master/js/player.js