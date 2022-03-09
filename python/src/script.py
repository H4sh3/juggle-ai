from agent import Agent

import vector

from ball import Ball
from config import MAX_ITERS

left_hand  = vector.obj(x=-1, y=0)
right_hand  = vector.obj(x=1, y=0)
hand_range = 0.1

ball = Ball(left_hand-vector.obj(x=0,y=0.2))

i = 0

import torch
device = torch.cuda.device("cuda" if torch.cuda.is_available() else "cpu")
print(device)

while i < MAX_ITERS:
    ball.update()
    i+=1 



