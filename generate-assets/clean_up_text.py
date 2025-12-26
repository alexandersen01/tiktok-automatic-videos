import re

from nltk.tokenize import sent_tokenize

synonyms = [
    ("AITA", "Am I the A-hole"),
    ("WIBTA", "Would I be the A-hole"),
    ("Asshole", "A-hole"),
    ("asshole", "A-hole"),
    (" mil ", " mother-in-law "),
    (" MIL ", " mother-in-law "),
    ("AH", "A-hole"),
    ("fuck", "frick"),
    ("fucking", "fricking")
]


def clean_up_text(text):
    for (original, replacement) in synonyms:
        text = text.replace(original, replacement)
    return text


def inside_parenthesis(text):
    return "(" in text and not ")" in text


def uppercase_age(text):
    return re.sub(r"(\([0-9]+ ?)([mf])(\s*\))", lambda match: r'{}{}{}'.format(match.group(1).upper(), match.group(2).upper(), match.group(3).upper()), text)


def is_edit(sentence):
    sentence = sentence.lower()
    return "edit" in sentence or "update" in sentence or sentence.startswith("eta")


def split_and_correct_text(text):
    text = re.sub(r" but ", ", but ", text)
    text = re.sub(r" and ", ", and ", text)
    text = re.sub(r" or ", ", or ", text)
    text = re.sub(r"\*", " - ", text)
    text = re.sub(r" \'", "'", text)

    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\.+", ".", text)
    text = re.sub(r",+", ",", text)
    sentences = sent_tokenize(".".join(text.split("\n")))

    for sentence in sentences:
        if is_edit(sentence):
            break
        corrected = sentence.strip()
        corrected = uppercase_age(corrected)
        if len(corrected.split()) < 25:
            yield corrected
            continue
        split = re.split(r"(,)", corrected)
        result = []
        for phrase in split:
            phrase = phrase.strip()
            result.append(phrase)

            if phrase == ",":
                if len(" ".join(result).split(" ")) > 15 and not inside_parenthesis(" ".join(result)):
                    yield(" ".join(result).replace(" ,", ","))
                    result = []

        if result:
            yield(" ".join(result).replace(" ,", ","))


def find_gender(text):
    """
    Detect the gender of the post author based on common Reddit patterns.
    Returns 'male' or 'female'.
    """
    text_lower = text.lower()
    
    # Pattern 1: "I (27M)" or "my (35F)" or "I(M27)" etc.
    # Matches: I (27M), my (35f), I(M27), me (f 35), I (27 M), etc.
    pattern1 = re.search(r"(?:^|\s)(?:i|my|me)\s*\(\s*(\d*)\s*([mf])\s*(\d*)\s*\)", text_lower)
    if pattern1:
        gender_char = pattern1.group(2)
        return 'male' if gender_char == 'm' else 'female'
    
    # Pattern 2: Standalone age/gender like "27M here" or "F25 here" or "I'm a 30M"
    pattern2 = re.search(r"(?:i'?m\s+(?:a\s+)?)?(\d+)\s*([mf])\b", text_lower)
    if pattern2:
        gender_char = pattern2.group(2)
        return 'male' if gender_char == 'm' else 'female'
    
    # Pattern 3: "M27" or "F25" at start or after "I'm"
    pattern3 = re.search(r"(?:^|\s|i'?m\s+(?:a\s+)?)([mf])\s*(\d+)", text_lower)
    if pattern3:
        gender_char = pattern3.group(1)
        return 'male' if gender_char == 'm' else 'female'
    
    # Pattern 4: Relationship context clues (the author is the opposite gender)
    # If they mention "my girlfriend/wife" -> author is likely male
    male_indicators = [
        "my girlfriend", "my wife", "my fiancée", "my fiancee",
        "my ex-girlfriend", "my ex-wife", "my gf ",
        "i'm a guy", "i am a guy", "i'm a man", "i am a man",
        "as a man", "as a guy", "male here"
    ]
    for indicator in male_indicators:
        if indicator in text_lower:
            return 'male'
    
    # If they mention "my boyfriend/husband" -> author is likely female
    female_indicators = [
        "my boyfriend", "my husband", "my fiancé", "my fiance",
        "my ex-boyfriend", "my ex-husband", "my bf ",
        "i'm a girl", "i am a girl", "i'm a woman", "i am a woman",
        "as a woman", "as a girl", "female here"
    ]
    for indicator in female_indicators:
        if indicator in text_lower:
            return 'female'
    
    # Default to female (slightly more common on story subreddits)
    return 'female'


if __name__ == '__main__':
    text = '''
    Example text\n
    Spread over multiple lines, and such AITA and they sometimes use alot of phrases chained together and stuff.
    not always having commas and some speling erors.
    Ok. 'fix this too please. '
    'For the past few months I (17m) haven’t had a good relationship with my mom or stepdad. '

    EDIT: this edit should be removed. And this should not be visible
    '''

    for line in split_and_correct_text(clean_up_text(text)):
        print(line)

    # Test gender detection
    test_cases = [
        ("I (M35) have 2 sisters", "male"),
        ("my (M35) have 2 sisters", "male"),
        ("My(M35) have 2 sisters", "male"),
        ("My(f35) have 2 sisters", "female"),
        ("My (F35) have 2 sisters", "female"),
        ("I'm a 27M and my girlfriend said", "male"),
        ("So I (25F) told my boyfriend", "female"),
        ("My wife and I got into a fight", "male"),
        ("My husband thinks I'm overreacting", "female"),
        ("I'm a guy and this happened", "male"),
        ("As a woman, I felt uncomfortable", "female"),
        ("30M here, need advice", "male"),
        ("F22 - my roommate is driving me crazy", "female"),
        ("No gender indicators here", "female"),  # default
    ]
    
    print("\nGender detection tests:")
    for text, expected in test_cases:
        result = find_gender(text)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{text[:40]}...' -> {result} (expected {expected})")
