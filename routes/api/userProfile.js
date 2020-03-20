// User profile API
const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const request = require("request");
const config = require("config");

const Profile = require("../../models/UserProfile"); //UserProfile from models/UserProfile
const User = require("../../models/User");
const Post = require("../../models/Post");

// @ route GET api/userProfile/me
// @desc Get user Profile
// @acess Private
router.get("/me", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({
			// changed userProfile to profile
			//check error
			user: req.user.id
		}).populate("user", ["name", "avatar"]);
		if (!profile) {
			// changed userProfile to profile
			return res
				.status(400)
				.json({ msg: "There is no profile for this user" });
		}
		res.json(profile); // changed from userProfile to profile
	} catch (err) {
		console.log(err);
		res.status(500).send("Server error");
	}
});

router.post(
	"/",
	[
		auth,
		[
			check("status", "Status is required")
				.not()
				.isEmpty(),
			check("skills", "Skills is required")
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin
		} = req.body;

		//Build profile object

		const profileFields = {};
		profileFields.user = req.user.id;
		if (company) profileFields.company = company;
		if (website) profileFields.website = website;
		if (location) profileFields.location = location;
		if (bio) profileFields.bio = bio;
		if (status) profileFields.status = status;
		if (githubusername) profileFields.githubusername = githubusername;
		if (skills) {
			// console.log('123');
			profileFields.skills = skills.split(",").map(skill => skill.trim());
		}
		profileFields.social = {};
		if (youtube) profileFields.social.youtube = youtube;
		if (twitter) profileFields.social.twitter = twitter;
		if (facebook) profileFields.social.facebook = facebook;
		if (linkedin) profileFields.social.linkedin = linkedin;
		if (instagram) profileFields.social.instagram = instagram;

		console.log(profileFields.skills);
		// res.send('Hello');

		try {
			let profile = await Profile.findOne({ user: req.user.id });
			if (profile) {
				profile = await Profile.findOneAndUpdate(
					// From UserProfile to Profile
					{ user: req.user.id },
					{ $set: profileFields },
					{ new: true }
				);
				return res.json(profile);
			}
			// console.log(profile)

			//Create
			profile = new Profile(profileFields);
			await profile.save();
			res.json(profile);
		} catch (err) {
			console.log(err);
			res.status(500).send("server error");
		}
	}
);

// @route    GET api/userProfile
// @desc     Get all profiles
// @access   Public

router.get("/", async (req, res) => {
	try {
		const profiles = await Profile.find().populate("user", [
			"name",
			"avatar"
		]);
		res.json(profiles);
	} catch (err) {
		console.log(err);
		res.status(500).send("Server Error");
	}
});

//@route    GET api/profile/user/:user_id
// @desc     Get profile by user ID
// @access   Public

router.get("/user/:user_id", async (req, res) => {
	try {
		const profile = await Profile.findOne({
			// UserProfile to Profile
			user: req.params.user_id
		}).populate("user", ["name", "avatar"]);

		if (!profile) return res.status(400).json({ msg: "Profile not found" });

		res.json(profile);
	} catch (err) {
		console.log(err);
		if (err.kind == "ObjectId") {
			return res.status(400).json({ msg: "Profile not found" });
		}
		res.status(500).send("Server Error");
	}
});

// @route    DELETE api/profile
// @desc     Delete profile, user & posts
// @access   Private
router.delete("/", auth, async (req, res) => {
	try {
		// Remove user posts

		// Remove profile
		await Profile.findOneAndRemove({ user: req.user.id }); //UserProfile to Profile
		// Remove user
		await User.findOneAndRemove({ _id: req.user.id });

		res.json({ msg: "User deleted" });
	} catch (err) {
		console.log(err);
		res.status(500).send("Server Error");
	}
});

// @route   PUT api/userProfile/experience
// @desc    Add profile experience
// @access   Private

router.put(
	"/experience",
	[
		auth,
		[
			check("title", "Title is required")
				.not()
				.isEmpty(),
			check("company", "Company is required")
				.not()
				.isEmpty(),
			check("from", "From date is required")
				.not()
				.isEmpty()
				.custom((value, { req }) =>
					req.body.to ? value < req.body.to : true
				)
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		const {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		} = req.body;

		const newExp = {
			title,
			company,
			location,
			from,
			to,
			current,
			description
		};
		try {
			const profile = await Profile.findOne({
				user: req.user.id //check error changed from userProfile/profile to user
			});

			profile.experience.unshift(newExp); //check error
			await profile.save();
			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	}
);

// @route   DELETE api/profile/experience
// @desc    Add profile experience
// @access   Private

router.delete("/experience/:exp_id", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }); //From UserProfile to Profile
		const removeIndex = profile.experience
			.map(item => item.id)
			.indexOf(req.params.exp_id);

		profile.exeperience.splice(removeIndex, 1);
		await profile.save();
		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});

router.put(
	"/education",
	[
		auth,
		[
			check("school", "Scool is required")
				.not()
				.isEmpty(),
			check("degree", "Degree is required")
				.not()
				.isEmpty(),
			check("fieldofstudy", "Field of study is required")
				.not()
				.isEmpty(),
			check("from", "From date is required")
				.not()
				.isEmpty()
		]
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}
		const {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		} = req.body;

		const newEdu = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description
		};
		try {
			const profile = await Profile.findOne({ user: req.user.id }); // From UserProfile to Profile

			profile.education.unshift(newEdu);
			await profile.save();
			res.json(profile);
		} catch (err) {
			console.error(err.message);
			res.status(500).send("Server Error");
		}
	}
);

// @route   DELETE api/profile/education
// @desc    Add profile experience
// @access   Private

router.delete("/education/:edu_id", auth, async (req, res) => {
	try {
		const profile = await Profile.findOne({ user: req.user.id }); // From UserProfile to Profile
		const removeIndex = profile.education
			.map(item => item.id)
			.indexOf(req.params.edu_id);

		profile.education.splice(removeIndex, 1);
		await profile.save();
		res.json(profile);
	} catch (err) {
		console.error(err.message);
		res.status(500).send("Server error");
	}
});

// @route   GET api/profile/github/:username
// @desc    Add profile experience
// @access   Public

module.exports = router;
