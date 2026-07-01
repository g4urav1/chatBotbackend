import openai from "openai";
import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import mongoose from "mongoose";

const app = express();

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
  })
  .catch((error) => {
    console.log("MongoDB connection error:", error);
  });

const userSchema = new mongoose.Schema({
  Email: {
    type: String,
    required: true
  },
  otp: {
    type: Number
  },
  password: {
    type: String
  },
  name: {
    type: String
  },
  age: {
    type: String
  }
});

const User = mongoose.model("User", userSchema);

const ai = new openai({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.KEY
});

const sender = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

app.post("/login", async (req, res) => {
  try {
    const otp = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();

    const template = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Login OTP</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f7fb; font-family:Arial, Helvetica, sans-serif; color:#1f2937;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Use this OTP to login to your chatbot account.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f7fb; padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#06b6d4); padding:32px 24px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:26px; font-weight:700;">
                ChAtBoT
              </h1>
              <p style="margin:8px 0 0; color:#e0f2fe; font-size:15px;">
                Secure chatbot login verification
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:36px 28px; text-align:center;">
              <h2 style="margin:0 0 12px; font-size:22px; color:#111827;">
                Your Login OTP
              </h2>

              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#4b5563;">
                Use the following one-time password to login to your chatbot account.
                Do not share this code with anyone.
              </p>

              <div style="display:inline-block; background-color:#f3f4f6; border:1px dashed #4f46e5; border-radius:12px; padding:18px 28px; margin-bottom:24px;">
                <span style="font-size:32px; letter-spacing:8px; font-weight:700; color:#111827;">
                  ${otp}
                </span>
              </div>

              <p style="margin:0; font-size:14px; color:#6b7280;">
                This OTP can be used for one-time login only.
              </p>

              <p style="margin:16px 0 0; font-size:13px; line-height:1.6; color:#9ca3af;">
                If you did not request this login, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fff7ed; border-radius:12px;">
                <tr>
                  <td style="padding:16px; font-size:13px; line-height:1.6; color:#9a3412;">
                    <strong>Security tip:</strong> ChAtBoT will never ask you to share your OTP over chat, phone, or email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color:#f9fafb; padding:22px 24px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                © ${year} ChAtBoT. All rights reserved.
              </p>
              <p style="margin:8px 0 0; font-size:12px; color:#9ca3af;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const mail = req.body.email;

    if (!mail) {
      return res.status(400).json({
        message: "Email is required"
      });
    }

    const userexist = await User.findOne({ Email: mail });

    let isNewUser = false;

    if (!userexist) {
      await User.create({
        Email: mail,
        otp: otp
      });

      isNewUser = true;
    } else {
      userexist.otp = otp;
      await userexist.save();
    }

    await sender.sendMail({
      from: `"ChAtBoT" <${process.env.MAIL_USER}>`,
      to: mail,
      subject: "Your ChAtBoT Login OTP",
      html: template
    });

    res.status(200).json({
      message: "OTP sent on email",
      isNewUser
    });

    console.log({
      message: "OTP sent on email",
      isNewUser
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "server error"
    });
  }
});

app.post("/loginAuthbyPass", async (req, res) => {
  try {
    const email = req.body.email;
    const pass = req.body.pass;

    if (!pass) {
      return res.status(400).json({
        message: "password is required"
      });
    }

    const userexist = await User.findOne({
      Email: email,
      password: pass
    });

    if (!userexist) {
      return res.status(400).json({
        message: "Incorrect password"
      });
    }

    res.status(200).json({
      message: "Login successfull",
      name: userexist.name
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "server error"
    });
  }
});

app.post("/loginAuth", async (req, res) => {
  try {
    const email = req.body.email;
    const otp = req.body.otp;

    if (!otp) {
      return res.status(400).json({
        message: "otp is required"
      });
    }

    const userexist = await User.findOne({
      Email: email,
      otp: otp
    });

    if (!userexist) {
      return res.status(400).json({
        message: "Incorrect Otp"
      });
    }

    res.status(200).json({
      message: "Login successfull",
      name: userexist.name
    });

    userexist.otp = undefined;

    await userexist.save();
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "server error"
    });
  }
});

app.post("/createPassword", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!password) {
      return res.status(400).json({
        message: "password is required"
      });
    }

    const userexist = await User.findOne({ Email: email });

    userexist.password = password;

    await userexist.save();

    res.status(200).json({
      message: "password created successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "server error"
    });
  }
});

app.post("/profile_info", async (req, res) => {
  try {
    const email = req.body.email;
    const name = req.body.name;
    const age = req.body.age;

    if (!name || !age) {
      return res.status(400).json({
        message: "All details are required"
      });
    }

    const userexist = await User.findOne({ Email: email });

    userexist.name = name;
    userexist.age = age;

    await userexist.save();

    res.status(200).json({
      message: "Details saved successfully"
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "server error"
    });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const message = req.body.message;

    const stream = await ai.chat.completions.create({
      model: "openrouter/owl-alpha",
      messages: [
        {
          role: "user",
          content: message
        }
      ],
      stream: true
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-encoding", "chunked");

    
    for await (const chunk of stream){
      const content = chunk.choices[0].delta.content||"";
      if(content){
        res.write(content);
      }
    }
    res.end();
  } catch (error) {
    console.log(error);
    res.status(500).json("server error");
  }
});

app.listen(process.env.port, () => {
  console.log("http://localhost:"+ process.env.port);
});