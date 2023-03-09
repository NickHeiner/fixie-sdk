# Developing a Fixie Agent

The Fixie platform allows you to build Agents in any language of your choice, by writing
a service that conforms to the protocol described in [Agent Protocol](agent-protocol.md).
For Python developers, we provide a Python library that makes it easy to implement Agents
using the API described below.

For a quick start on building your own Fixie Agent, check out the [Quick Start](agent-quickstart.md) guide.

See [Fixie Agent Python API](python-agent-api.md) for the full API reference.

## CodeShotAgent

The base class for Agents in Fixie is [ `CodeShotAgent` ][fixieai.agents.code_shot. CodeShotAgent].
This class takes care of communicating with the Fixie platform via the [Agent Protocol](agent-protocol.md), 
and provides a simple API for registering functions that can be invoked by the few-shot examples
used by the Agent.

The structure of a `CodeShotAgent` is typically as follows:

```python
import fixieai

BASE_PROMPT = "Base prompt for the agent."
FEW_SHOTS = """
Q: Example query for the Agent
Ask Func[my_func]: query to the func
Func[my_func] says: response to the query
A: Response generated by the Agent

Q: Second example query to the agent
A: Second response generated by the Agent
"""

agent = fixieai.CodeShotAgent(BASE_PROMPT, FEW_SHOTS)

@agent.register_func()
def my_func(query: fixieai.Message) -> str:
    return "Response to the query"
```

The `BASE_PROMPT` and `FEW_SHOTS` strings are used to provide examples to the underlying
Large Language Model, such as GPT-3, as well as to provide the Fixie Platform information
on what kinds of queries this Agent can support.

The `FEW_SHOTS` provided to an Agent must be a string consisting of one or more *stanzas*, where
each stanza consists of a question, one or more rounds of internal actions taken by the Agent, 
and a final answer. Stanzas must be separated from each other by a blank line. The query line
in the stanza must start with `Q:` , and the answer line must start with `A:` .

Internal actions taken by the Agent can be of one of two forms:
* `Ask Func[<func_name>]: <query_text>`: This indicates that the function `<func_name>` should
  be invoked when the output of the underlying LLM starts with this string. The string following
`Ask Func[<func_name>]:` is passed to the function as the `query.text` parameter.
* `Ask Agent[<agent_name>]: <query_text>`: This indicates that the Agent `<agent_name>` should
  be invoked when the output of the underlying LLM starts with this string. The string following
`Ask Agent[<agent_name>]:` is passed to the Agent as the `query.text` parameter.

The `register_func` decorator is used to register a function that can be invoked by the Agent.
The function must take a single parameter, which is a [ `Message` ][fixieai.agents.api. Message]
object, and must return either a string or a `Message` . The `Message` object contains the text of
the query, as well as any Embeds associated with the Message (see [Embeds](#Embeds) below).

## Embeds

**Embeds** allow arbitrary binary data to be associated with a query or response Message in
Fixie, similar to email attachments. Embeds can be used to store images, video, text, or
any other binary data.

Embeds are represented by the [ `Embed` ][fixieai.agents.api. Embed] class. Agents can access
the Embeds associated with a Message as follows:

```python
@agent.register_func()
def my_func(query: fixieai.Message) -> str:
    for key, embed in query.embeds.items():
        print(f"Embed key: {key}")
        print(f"Embed content-type: {embed.content_type}")
        embed_value_as_text = embed.text
        embed_value_as_bytes = embed.content
```

An Agent function can also add an Embed to its response Message by adding it to the
`embeds` dictionary of the `Message` object:

```python
@agent.register_func()
def my_func(query: fixieai.Message) -> fixieai.Message:
  reply = fixieai.Message("Response to the query")
  reply.embeds["my_embed"] = fixieai.Embed(content_type="text/plain")
  reply.embeds["my_embed"].text = "Hello, world!"
```

## User Storage

Fixie Agents can store and retrieve arbitrary data associated with a user, using the
[`UserStorage`][fixieai.agents.UserStorage] class. This class provides a simple
interface to a persistent key/value storage service, with a separate key/value
store for each Fixie user. This can be used to maintain state about a particular
user that persists across Agent invocations.

The `UserStorage` instance for a given query can be obtained by providing a `user_storage`
parameter to an Agent function. The `UserStorage` object acts as a Python `dict` that stores
state associated with an arbitrary string key. `UserStorage` values may consist of Python
primitive types, such as `str`, `int`, `float`, `bool`, `None`, or `bytes`, as well as
lists of these types, or a Dict mapping a `str` to one of these types.

### User Storage Example

```python
@agent.register_func()
def my_func(query: fixieai.Message, user_storage: fixieai.UserStorage) -> str:
    user_storage["my_key"] = "my_value"
    return user_storage["my_key"]
```


## Agent OAuth Support

Fixie Agents can authenticate to third-party services to perform
actions on behalf of the user. This is done using OAuth 2.0, which
is a standard protocol for authorization. OAuth 2.0 allows users
to grant limited access to their accounts on one service, to another
service, without having to share their password.

Fixie provides a simple interface for Agents to perform OAuth
authentication, using the [`OAuthParams`][fixieai.agents.OAuthParams] class.
Using this class, an Agent function can use the [`OAuthHandler`][fixieai.agents.OAuthHandler]
class -- which is passed to the function as the `oauth_handler` parameter -- to obtain an access
token for the user.

### OAuth Example

```python
import fixieai

oauth_params = fixieai.OAuthParams()
oauth_params.client_id = "XXXXX.apps.googleusercontent.com",
oauth_params.auth_uri = "https://accounts.google.com/o/oauth2/auth"
oauth_params.token_uri = "https://oauth2.googleapis.com/token"
oauth_params.client_secret = "XXXXXXXXX"

agent = fixieai.CodeShotAgent(BASE_PROMPT, FEW_SHOTS, oauth_params=oauth_params)

@agent.register_func
def my_func(query, oauth_handler: fixieai.OAuthHandler):
  user_token = oauth_handler.user_token()
  if user_token is None:
    # Return the URL that the user should click on to authorize the Agent.
    return oauth_handler.get_authorization_url()

  # Do something with the user_token returned by the OAuth handler.
  client = gcalendar_client.GcalendarClient(user_token)
  # ...
```