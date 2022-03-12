import sketch, { inView } from "."
import { GRAVITY, height, NUM_AREAS, width } from "./config"

const calcAngle = (v1, v2, s) => {
    const angleRad = Math.atan2(v1.x, v1.y) - Math.atan2(v2.x, v2.y)
    return s.degrees(angleRad)
}

const getBall = (pos, s) => {
    return {
        pos,
        acc: s.createVector(0, 0.1),
        vel: s.createVector(0, 0),
        wasLeft: false,
        wasRight: false,
        radius: 20,
        dropped: false,
        active: false,
        data: []
    }
}

const getStart = (input) => {
    for (let i = 0; i < input.length; i++) {
        if (input[i] == 1) {
            return i
        }
    }
}

const getTarget = (output) => {
    let maxIndex = 0
    let maxValue = -Infinity
    for (let i = 0; i < output.length - 1; i++) {
        if (output[i] > maxValue) {
            maxIndex = i
            maxValue = output[i]
        }
    }
    return maxIndex
}

const getAreas = (s, center, width) => {
    const areas = []
    const n = NUM_AREAS
    const h = Math.floor(n / 2)
    const step = width / n
    for (let i = -h; i < h; i++) {
        areas.push(center.copy().add(s.createVector(step / 2 + step * i, (width / n) / 2)))
    }
    return areas
}

const getAngle = (s, x, vel) => {
    let smallestDist = Infinity
    let bestAngle
    for (let i = 0; i < 45; i += 0.1) {
        const target = s.createVector(x, 0)

        const v0 = vel.mag()

        const angle = i

        const v1 = GRAVITY * Math.pow(x, 2)

        const v2 = 2 * Math.pow(v0, 2) * Math.pow(Math.cos(s.radians(angle)), 2)

        let y = (x * s.tan(s.radians(angle))) - (v1 / v2)
        y *= -1


        const actual = s.createVector(x, y)

        const dist = actual.dist(target)

        if (dist < smallestDist) {
            smallestDist = dist
            bestAngle = angle
        }

    }
    return bestAngle
}

export const getKey = (s, t, v) => {
    return `s-${s}#t-${t}#v-${v}`
}
export class Agent {
    constructor(s, nn) {
        this.nn = nn
        this.nn.score = 0
        this.areaWidth = 180
        this.leftCenter = s.createVector(100, height - 150)
        this.rightCenter = s.createVector(width - 100, height - 150)
        this.areasLeft = getAreas(s, this.leftCenter, this.areaWidth)
        this.areasRight = getAreas(s, this.rightCenter, this.areaWidth)
        this.rotationDict = {}


        let vel = s.createVector(0, -6)
        for (let i = 0; i < this.areasLeft.length; i++) {
            let start = this.areasLeft[i]
            for (let j = 0; j < this.areasRight.length; j++) {
                let target = this.areasRight[j]

                const angle = getAngle(s, target.x - start.x, vel)
                this.rotationDict[getKey(i, j, vel.y)] = {
                    vel,
                    angle
                }
            }
        }

        vel = s.createVector(0, -8)
        for (let i = 0; i < this.areasLeft.length; i++) {
            let start = this.areasLeft[i]
            for (let j = 0; j < this.areasRight.length; j++) {
                let target = this.areasRight[j]

                const angle = getAngle(s, target.x - start.x, vel)
                this.rotationDict[getKey(i, j, vel.y)] = {
                    vel,
                    angle
                }
            }
        }

        this.initPosEtc(s)
    }

    getBallSpawn(s, hand) {
        const xOffset = s.createVector(s.random(-25, 25), 0)
        return s.createVector(hand.x, 150)//.add(xOffset)
    }

    initPosEtc(s) {
        this.ballCollision = false
        this.tmpData = []
        this.data = []
        this.balls = []
    }

    score() {
        return this.nn.score
    }

    getInput(s, ball, areas, i) {

        let minDist = Infinity
        let minDistAreaIndex
        for (let i = 0; i < areas.length; i++) {
            const dist = areas[i].dist(ball.pos)
            if (dist < minDist) {
                minDist = dist
                minDistAreaIndex = i
            }
        }

        let inputs = []
        for (let i = 0; i < areas.length; i++) {
            if (i == minDistAreaIndex) {
                inputs.push(1)
            } else {
                inputs.push(0)
            }
        }
        return inputs
    }

    ballsDropped() {
        return this.balls.some(b => b.dropped)
    }

    handleSpawn(s, i) {
        /*         if (i == 0) {
                    this.balls.push(getBall(this.getBallSpawn(s, this.leftCenter.copy().add(s.createVector(65, 0))), s))
                }
                if (i == 25) {
                    this.balls.push(getBall(this.getBallSpawn(s, this.rightCenter.copy().add(s.createVector(65, 0))), s))
                }
                if (i == 50) {
                    this.balls.push(getBall(this.getBallSpawn(s, this.leftCenter.copy().add(s.createVector(65, 0))), s))
                } */
        if (i == 0) {
            this.balls.push(getBall(this.spawnPositions[0].copy(), s))
        }
        if (i == 5) {
            this.balls.push(getBall(this.spawnPositions[1].copy(), s))
        }
        if (i == 15) {
            this.balls.push(getBall(this.spawnPositions[2].copy(), s))
        }
    }

    checkCollision() {
        this.balls.forEach(b1 => {
            this.balls.forEach(b2 => {
                if (b1 == b2) return

                if (b1.pos.dist(b2.pos) < b1.radius) {
                    this.ballCollision = true
                }
            })
        })
    }

    update(s, exploreRate, i) {
        this.handleSpawn(s, i)
        this.checkCollision()

        if (this.ballCollision) return


        const isLeft = (pos) => {
            const widthHalf = this.areaWidth / 2
            const minX = this.leftCenter.x - widthHalf
            const maxX = this.leftCenter.x + widthHalf
            const minY = this.leftCenter.y - (this.areaWidth / 8) / 2
            const maxY = this.leftCenter.y + (this.areaWidth / 8) / 2
            return (
                pos.x > minX &&
                pos.x < maxX &&
                pos.y > minY &&
                pos.y < maxY
            )
        }

        const isRight = (pos) => {
            const widthHalf = this.areaWidth / 2
            const minX = this.rightCenter.x - widthHalf
            const maxX = this.rightCenter.x + widthHalf
            const minY = this.rightCenter.y - (this.areaWidth / 8) / 2
            const maxY = this.rightCenter.y + (this.areaWidth / 8) / 2

            return (
                pos.x > minX &&
                pos.y > minY &&
                pos.x < maxX &&
                pos.y < maxY
            )
        }


        for (let i = 0; i < this.balls.length; i++) {
            const ball = this.balls[i]
            ball.acc = s.createVector(0, 0.1)

            ball.dropped = !inView(ball.pos)

            if (ball.dropped) {
                console.log("dropped")
                continue
            }

            const getOutputs = (input) => {
                let output
                if (s.random(0, 1) < exploreRate) {
                    output = []
                    for (let i = 0; i < NUM_AREAS + 1; i++) {
                        output.push(s.random(0, 1))
                    }
                } else {
                    output = this.nn.activate(input);
                }
                return output
            }

            if (isLeft(ball.pos)) {

                if (ball.wasRight) {
                    // data inside ball resulted in this hit
                    this.data.push(ball.data)
                    ball.data = []
                    ball.hit = false
                    ball.wasRight = false
                    this.nn.score += 1
                }

                if (!ball.wasLeft) {
                    ball.vel.x = 0
                    ball.vel.y = 0
                    let input = this.getInput(s, ball, this.areasLeft, i)
                    const start = getStart(input)
                    ball.pos = this.areasLeft[start].copy()

                    input.push(-1)
                    input.push(1)

                    const output = getOutputs(input)
                    //console.log(output)

                    const target = getTarget(output)
                    const key = getKey(start, target, output[output.length - 1] > .5 ? -6 : -8)

                    const entry = this.rotationDict[key]
                    ball.vel = entry.vel.copy().rotate(s.radians(entry.angle))

                    ball.data.push({ input, output })

                    ball.active = true
                    //ball.acc.add(outputToAcc(s, i, output))

                    ball.wasLeft = true
                }

            } else {
                ball.active = false
            }

            if (isRight(ball.pos)) {
                if (ball.wasLeft) {
                    // data inside ball resulted in this hit
                    this.data.push(ball.data)
                    ball.data = []
                    ball.hit = false
                    ball.wasLeft = false
                    this.nn.score += 1
                }

                if (!ball.wasRight) { // only once acceleration per contact
                    let input = this.getInput(s, ball, this.areasRight, i)

                    const start = getStart(input)
                    ball.pos = this.areasRight[start].copy()

                    input.push(-1)
                    input.push(1)

                    const output = getOutputs(input)

                    const target = getTarget(output)
                    const key = getKey(NUM_AREAS - 1 - start, NUM_AREAS - 1 - target, output[output.length - 1] > 0 ? -6 : -8)
                    const entry = this.rotationDict[key]

                    ball.vel = entry.vel.copy().rotate(s.radians(-entry.angle))
                    ball.data.push({ input, output })


                    ball.wasRight = true
                }
            }

            ball.vel.y += GRAVITY / 2
            ball.pos.add(ball.vel)
            ball.vel.y += GRAVITY / 2
        }
    }
}