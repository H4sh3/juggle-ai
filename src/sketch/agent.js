import sketch, { inView } from "."
import { height, width } from "./config"

const calcAngle = (v1, v2, s) => {
    const angleRad = Math.atan2(v1.x, v1.y) - Math.atan2(v2.x, v2.y)
    return s.degrees(angleRad)
}

const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, 0),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20,
        dropped: false
    }
}

export class Agent {
    constructor(sketch, nn) {
        this.nn = nn
        this.nn.score = 0
        this.handLeft = sketch.createVector(100, height - 150)
        this.handRight = sketch.createVector(width - 100, height - 150)
        this.handRadius = 100

        this.initPosEtc(sketch)


    }

    initPosEtc(s) {
        this.ballCollision = false
        this.ballSpawn = s.createVector(this.handLeft.x, 150)
        this.data = []
        this.balls = []
        this.balls.push(getBall(this.ballSpawn.copy(), s))
        this.balls.push(getBall(s.createVector(this.handRight.x, 150), s))
    }

    score() {
        return this.nn.score
    }

    getInput(s, ball) {
        const ballTransformed = ball.pos.copy().sub(this.handLeft)
        const mappedX = s.map(ballTransformed.x, 0, this.handRadius, 0, 1)
        const mappedY = s.map(ballTransformed.y, 0, this.handRadius, 0, 1)
        const ballVelX = s.map(ball.vel.x, -10, 10, 0, 1)
        const ballVelY = s.map(ball.vel.y, -10, 10, 0, 1)
        return [mappedX, mappedY, ballVelX, ballVelY]
    }

    ballsDropped() {
        return this.balls.every(b => b.dropped)
    }

    update(s, explore) {

        if (this.balls.length < 3) {
            if (this.balls[0].pos.dist(this.ballSpawn) > 50) {
                this.balls.push(getBall(this.ballSpawn.copy(), s))
            }
        }

        if (this.ballCollision) return

        const accRangeX = 2
        const accRangeY = -4
        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i]

            if (ball.dropped) continue

            if (!inView(ball.pos)) {
                ball.dropped = true
            }

            ball.acc = s.createVector(0, 0.1)
            const distLeft = ball.pos.dist(this.handLeft)
            if (distLeft < this.handRadius / 2) {
                let input = this.getInput(s, ball)
                input.push(0) // left

                let output
                if (explore && s.random() < .2) {
                    output = [s.random(0, 1), s.random(0, 1)]
                } else {
                    output = this.nn.activate(input);
                }

                const accX = s.map(output[0], 0, 1, 0, accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)

                ball.acc.add(s.createVector(accX, accY))

                ball.wasLeft = true
                if (ball.wasRight) {
                    this.nn.score += 1
                    ball.wasRight = false
                }
                this.data.push({ input, output })

            }

            const distRight = ball.pos.dist(this.handRight)
            if (distRight < this.handRadius / 2) {
                let input = this.getInput(s, ball)
                input.push(1) // right

                let output
                if (explore && s.random() < .2) {
                    output = [s.random(0, 1), s.random(0, 1)]
                } else {
                    output = this.nn.activate(input);
                }

                const accX = s.map(output[0], 0, 1, 0, -accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)

                ball.acc.add(s.createVector(accX, accY))

                ball.wasRight = true
                if (ball.wasLeft) {
                    this.nn.score += 1
                    ball.wasLeft = false

                }
                this.data.push({ input, output })
            }

            ball.vel.add(ball.acc)
            ball.pos.add(ball.vel)
        }


        this.balls.forEach(b1 => {
            this.balls.forEach(b2 => {
                if (b1 == b2) return

                if (b1.pos.dist(b2.pos) < b1.radius) {
                    //this.ballCollision = true
                }
            })
        })

    }
}