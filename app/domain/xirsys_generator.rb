class XirsysGenerator
  def initialize
    @result = result["v"]
  end

  def result
    @_result ||= HTTParty.put(xirsys_secrets["ice_server"], query: query, basic_auth: auth)
  end

  def query
    {
      expire: xirsys_secrets["expire"]
    }
  end

  def auth
    {
      username: xirsys_secrets["ident"],
      password: xirsys_secrets["secret"]
    }
  end

  def ice_servers
    @_ice_servers = result["v"].to_json
  end

  def signal_server
    # "wss://endpoint02.uswest.xirsys.com:443/ws"
    Rails.application.secrets.nat_server["xirsys"]["signal_server"]
  end

  def xirsys_secrets
    @_xirsus_secrets ||= Rails.application.secrets.nat_server["xirsys"]
  end
end