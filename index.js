import express from "express"
import { randomBytes } from "crypto"
import cors from "cors"
import axios from "axios"

const app = express()
app.use(express.json())
app.use(cors())

const commentsByPostId = {}

app.get("/posts/:id/comments", (req, res) => {
  return res.send(commentsByPostId[req.params.id] || [])
})
app.post("/posts/:id/comments", async (req, res) => {
  const commentId = randomBytes(4).toString("hex")
  const { content } = req.body
  const { id: postId } = req.params

  const comments = commentsByPostId[postId] || []
  comments.push({ id: commentId, content, status: "pending" })

  commentsByPostId[postId] = comments

  await axios.post("http://event-bus-srv:5000/events", {
    type: "CommentCreated",
    data: {
      id: commentId,
      content,
      postId,
      status: "pending"
    }
  })

  return res.status(201).send({ commentId, content })
})

app.post("/events", async (req, res) => {
  const { type, data } = req.body
  console.log("Event Received => ", type, data)

  if (type === "CommentModerated") {
    const { postId, id, status, content } = data
    const comments = commentsByPostId[postId]
    const comment = comments.find((comment) => comment.id === id)
    comment.status = status
    await axios.post("http://event-bus-srv:5000/events", {
      type: "CommentUpdated",
      data: {
        id,
        postId,
        status,
        content
      }
    })
  }

  return res.send({})
})

app.listen(4000, () => {
  console.log("Service running on port 4000")
})
