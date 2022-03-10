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
        dropped: false,
        hit: false
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
        const xOffset = s.createVector(s.random(-15, 15), 0)
        this.balls.push(getBall(this.ballSpawn.copy(), s))
        //this.balls.push(getBall(s.createVector(this.handRight.x, 150), s))
    }

    score() {
        return this.nn.score
    }

    getInput(s, ball, hand) {
        const halfHand = this.handRadius / 2
        const ballTransformed = ball.pos.copy().sub(hand)
        const mappedX = s.map(ballTransformed.x, -halfHand, halfHand, -1, 1)
        const mappedY = s.map(ballTransformed.y, -halfHand, halfHand, -1, 1)

        const angle = s.degrees(ballTransformed.angleBetween(hand))
        const mappedAngle = s.map(angle, -180, 180, -1, 1)

        const dist = ball.pos.dist(hand)
        const mappedDist = s.map(dist, 0, halfHand, -1, 1)

        let velXMapped = s.map(ball.vel.x, -10, 10, -1, 1)
        let velYMapped = s.map(ball.vel.x, -10, 10, -1, 1)

        velXMapped = velXMapped > 1 ? 1 : velXMapped
        velXMapped = velXMapped < -1 ? -1 : velXMapped

        velYMapped = velYMapped > 1 ? 1 : velYMapped
        velYMapped = velYMapped < -1 ? -1 : velYMapped

        //console.log(mappedAngle, mappedDist)
        return [mappedAngle, mappedDist]
    }

    ballsDropped() {
        return this.balls.every(b => b.dropped)
    }

    update(s, explore) {

        if (this.balls.length < 3) {
            if (this.balls[this.balls.length - 1].pos.dist(this.ballSpawn) > 50) {
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

                let input = this.getInput(s, ball, this.handLeft)
                input = input.concat([0, 1]) // left

                let output
                if (explore && s.random() < .3) {
                    output = [s.random(0, 1), s.random(0, 1), s.random(0, 1)]
                } else {
                    output = this.nn.activate(input);
                }

                let accX = s.map(output[0], 0, 1, 0, accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)
                ball.acc.add(s.createVector(accX, accY).mult(s.map(output[2], -1, 1, 0.9, 3)))


                ball.hit = true
                this.data.push({ input, output })


                ball.wasLeft = true
                if (ball.wasRight) {
                    this.nn.score += 1
                    ball.wasRight = false
                    ball.hit = false
                }
            }

            const distRight = ball.pos.dist(this.handRight)
            if (distRight < this.handRadius / 2) {


                let input = this.getInput(s, ball, this.handRight)
                input = input.concat([1, 0]) // right

                let output
                if (explore && s.random() < .2) {
                    output = [s.random(0, 1), s.random(0, 1), s.random(0, 1)]
                } else {
                    output = this.nn.activate(input);
                }

                let accX = s.map(output[0], 0, 1, 0, -accRangeX)
                const accY = s.map(output[1], 0, 1, 0, accRangeY)
                ball.acc.add(s.createVector(accX, accY).mult(s.map(output[2], -1, 1, 0.9, 3)))

                ball.hit = true
                this.data.push({ input, output })


                ball.wasRight = true
                if (ball.wasLeft) {
                    this.nn.score += 1
                    ball.wasLeft = false
                    ball.hit = false
                }
            }

            ball.acc.add(s.createVector(0, 0.1))
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